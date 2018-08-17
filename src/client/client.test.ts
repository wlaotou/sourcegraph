import * as assert from 'assert'
import { createMessageConnection, MessageConnection, MessageTransports } from '../jsonrpc2/connection'
import { MessageType as RPCMessageType } from '../jsonrpc2/messages'
import { ClientCapabilities, InitializeParams, RegistrationParams, UnregistrationParams } from '../protocol'
import { clientStateIs, getClientState } from '../test/helpers'
import { createMessageTransports } from '../test/integration/helpers'
import { Client, ClientOptions, ClientState } from './client'
import { CloseAction, ErrorAction, ErrorHandler } from './errorHandler'
import { DynamicFeature, RegistrationData, StaticFeature } from './features/common'

class TestClient extends Client {
    constructor(
        createMessageTransports: ClientOptions['createMessageTransports'] = () => {
            throw new Error('connection is not used in unit test')
        }
    ) {
        super('', '', { root: null, createMessageTransports })
    }
}

describe('Client', () => {
    describe('feature registration', () => {
        class FeatureRegistrationTestClient extends TestClient {
            public readonly features!: Client['features']
            public handleRegistrationRequest(params: RegistrationParams): void {
                super.handleRegistrationRequest(params)
            }
            public handleUnregistrationRequest(params: UnregistrationParams): void {
                super.handleUnregistrationRequest(params)
            }
        }

        const FIXTURE_STATIC_FEATURE: StaticFeature = {
            fillInitializeParams: (params: InitializeParams) => (params.initializationOptions = 'test'),
            fillClientCapabilities: (capabilities: ClientCapabilities) => (capabilities.experimental = 'test'),
            initialize: () => void 0,
        }

        const FIXTURE_DYNAMIC_FEATURE: DynamicFeature<any> = {
            messages: { method: 'm' },
            fillInitializeParams: (params: InitializeParams) => (params.initializationOptions = 'test'),
            fillClientCapabilities: (capabilities: ClientCapabilities) => (capabilities.experimental = 'test'),
            initialize: () => void 0,
            register: () => void 0,
            unregister: () => void 0,
            unregisterAll: () => void 0,
        }

        it('registers static feature', () => {
            const client = new FeatureRegistrationTestClient()
            client.registerFeature(FIXTURE_STATIC_FEATURE)
            assert.deepStrictEqual(client.features, [FIXTURE_STATIC_FEATURE])
        })

        it('registers dynamic feature', () => {
            const client = new FeatureRegistrationTestClient()
            client.registerFeature(FIXTURE_DYNAMIC_FEATURE)
            assert.deepStrictEqual(client.features, [FIXTURE_DYNAMIC_FEATURE])
        })

        it('prevents dynamic feature registration with conflicting method', () => {
            const client = new FeatureRegistrationTestClient()
            client.registerFeature(FIXTURE_DYNAMIC_FEATURE)
            assert.throws(() => client.registerFeature(FIXTURE_DYNAMIC_FEATURE))
            assert.deepStrictEqual(client.features, [FIXTURE_DYNAMIC_FEATURE])
        })

        describe('dynamic (un)registration', () => {
            interface RegisterCallArgs {
                message: RPCMessageType
                data: RegistrationData<any>
                overwriteExisting?: boolean
            }

            it('handles a registration request for a dynamic feature', () => {
                const client = new FeatureRegistrationTestClient()
                const registerCalls: RegisterCallArgs[] = []
                const unregisterCalls: string[] = []
                client.registerFeature({
                    ...FIXTURE_DYNAMIC_FEATURE,
                    register: (message, data) => registerCalls.push({ message, data }),
                    unregister: id => unregisterCalls.push(id),
                })

                // Request registration.
                client.handleRegistrationRequest({
                    registrations: [{ id: 'a', method: 'm', registerOptions: { a: 1 }, overwriteExisting: true }],
                })
                assert.deepStrictEqual(registerCalls, [
                    { message: { method: 'm' }, data: { id: 'a', registerOptions: { a: 1 }, overwriteExisting: true } },
                ] as typeof registerCalls)

                // Request unregistration.
                client.handleUnregistrationRequest({
                    unregisterations: [{ id: 'a', method: 'm' }],
                })
                assert.deepStrictEqual(unregisterCalls, ['a'] as typeof unregisterCalls)
            })

            it('rejects registration requests for unknown dynamic features', () => {
                const client = new FeatureRegistrationTestClient()
                assert.throws(() => client.handleRegistrationRequest({ registrations: [{ id: 'a', method: 'x' }] }))
            })

            it('rejects unregistration requests for unknown dynamic features', () => {
                const client = new FeatureRegistrationTestClient()
                assert.throws(() =>
                    client.handleUnregistrationRequest({ unregisterations: [{ id: 'a', method: 'x' }] })
                )
            })
        })
    })

    describe('state', () => {
        const MESSAGE_TRANSPORTS_ERROR = () => {
            throw new Error('test')
        }

        it('enters ClientState.Connecting when activated', async () => {
            const client = new TestClient()
            client.activate()
            assert.strictEqual(getClientState(client), ClientState.Connecting)
            client.activate()
            assert.strictEqual(getClientState(client), ClientState.Connecting)
            await client.stop()
            client.activate()
            assert.strictEqual(getClientState(client), ClientState.Connecting)
        })

        it('stops immediately when in ClientState.Initial', async () => {
            const client = new TestClient()
            const stop = client.stop()
            assert.strictEqual(getClientState(client), ClientState.Stopped)
            await stop
            assert.strictEqual(getClientState(client), ClientState.Stopped)
        })

        it('enters ClientState.ActivateFailed when connection fails synchronously', async () => {
            const client = new TestClient(MESSAGE_TRANSPORTS_ERROR)
            client.activate()
            assert.strictEqual(getClientState(client), ClientState.Connecting)
            await clientStateIs(client, ClientState.ActivateFailed, [ClientState.Stopped])
        })

        it('enters ClientState.ActivateFailed when connection fails asynchronously', async () => {
            // Use async createMessageTransports that throws so that the client proceeds beyond the synchronous
            // portion of activation.
            const client = new TestClient(async () => MESSAGE_TRANSPORTS_ERROR())
            client.activate()
            assert.strictEqual(getClientState(client), ClientState.Connecting)
            await clientStateIs(client, ClientState.ActivateFailed, [ClientState.Stopped])
        })

        it('enters ClientState.Stopped when stopped with connection that fails synchronously', async () => {
            const client = new TestClient(MESSAGE_TRANSPORTS_ERROR)
            client.activate()
            const stop = client.stop()
            assert.strictEqual(getClientState(client), ClientState.Stopped)
            await stop
            assert.strictEqual(getClientState(client), ClientState.Stopped)
        })

        it('enters ClientState.Stopped when stopped with connection that fails asynchronously', async () => {
            // Use async createMessageTransports that throws so that the client proceeds beyond the synchronous
            // portion of activation.
            const client = new TestClient(async () => MESSAGE_TRANSPORTS_ERROR())
            client.activate()
            const stop = client.stop()
            assert.strictEqual(getClientState(client), ClientState.Stopped)
            await stop
            assert.strictEqual(getClientState(client), ClientState.Stopped)
        })

        it('stops while in ClientState.Connecting', async () => {
            // Delay the resolution of createMessageTransports forever so that we are "stuck" in the connecting
            // state.
            let reject!: () => void
            const client = new TestClient(() => new Promise<any>((_resolve, reject2) => (reject = reject2)))
            client.activate()
            assert.strictEqual(getClientState(client), ClientState.Connecting)
            const stop = client.stop()
            assert.strictEqual(getClientState(client), ClientState.Stopped)
            await stop
            assert.strictEqual(getClientState(client), ClientState.Stopped)
            reject()
        })
    })

    describe('connection', () => {
        class ConnectionTestClient extends Client {
            constructor(options: Pick<ClientOptions, Exclude<keyof ClientOptions, 'root'>>) {
                super('', '', { ...options, root: null })
            }

            public activateAndWait(): Promise<void> {
                return super.activateAndWait()
            }
        }

        const createClientTransportsForTestServer = (
            registerServer?: (server: MessageConnection) => void
        ): MessageTransports => {
            const [clientTransports, serverTransports] = createMessageTransports()
            const serverConnection = createMessageConnection(serverTransports)
            serverConnection.listen()
            if (registerServer) {
                registerServer(serverConnection)
            }
            return clientTransports
        }

        describe('messages', () => {
            it('rejects sends and handlers before the connection is active', () => {
                const client = new TestClient()
                assert.throws(() => client.sendNotification('x'))
                assert.throws(() => client.sendRequest('x'))
                assert.throws(() => client.onNotification('x', () => void 0))
                assert.throws(() => client.onRequest('x', () => void 0))
            })
        })

        describe('activation', () => {
            it('does not proceed if client was stopped after establishing the connection', async () => {
                const client = new ConnectionTestClient({
                    createMessageTransports: () =>
                        Promise.resolve(createClientTransportsForTestServer()).then(messageTransports => {
                            client.stop().catch(err => {
                                throw err
                            })
                            return messageTransports
                        }),
                })
                await client.activateAndWait()
                await clientStateIs(client, ClientState.Stopped, [
                    ClientState.Initializing,
                    ClientState.Active,
                    ClientState.ActivateFailed,
                ])
            })

            it('does not proceed if client was stopped after receiving the server initialize response', async () => {
                const client = new ConnectionTestClient({
                    createMessageTransports: () =>
                        createClientTransportsForTestServer(server => {
                            server.onRequest('initialize', () => {
                                client.stop().catch(err => {
                                    throw err
                                })
                                return {}
                            })
                        }),
                })
                await client.activateAndWait()
                await clientStateIs(client, ClientState.Stopped, [
                    ClientState.Initializing,
                    ClientState.Active,
                    ClientState.ActivateFailed,
                ])
            })
        })

        describe('initializationFailedHandler', () => {
            it('calls the initializationFailedHandler when initialization fails', async () => {
                let initializationFailedHandlerCalled: () => void
                const done = new Promise<void>(resolve => (initializationFailedHandlerCalled = resolve))
                const client = new ConnectionTestClient({
                    createMessageTransports: () =>
                        createClientTransportsForTestServer(server => {
                            server.onRequest('initialize', () => {
                                throw new Error('test')
                            })
                        }),
                    initializationFailedHandler: () => {
                        initializationFailedHandlerCalled()
                        return false
                    },
                })
                client.activate()
                await done
            })
        })

        describe('errorHandler', () => {
            const create = async (errorHandler: ErrorHandler) => {
                const clientTransports = createClientTransportsForTestServer(server => {
                    server.onRequest('initialize', () => void 0)
                })
                const client = new ConnectionTestClient({
                    createMessageTransports: () => clientTransports,
                    errorHandler,
                })
                client.activate()
                await clientStateIs(client, ClientState.Active)
                return {
                    client,
                    fireConnectionError: () => (clientTransports.reader as any).fireError(new Error('test')),
                    fireConnectionClose: () => (clientTransports.reader as any).fireClose(),
                }
            }

            const createWaiter = () => {
                let unlock!: () => void
                const done = new Promise<void>(resolve => (unlock = resolve))
                return { unlock, done }
            }

            it('shuts down after calling the errorHandler when the connection reports an error', async () => {
                const { unlock, done } = createWaiter()
                const { client, fireConnectionError } = await create({
                    error: () => {
                        unlock()
                        return ErrorAction.ShutDown
                    },
                    closed: () => {
                        throw new Error('unreachable')
                    },
                })
                fireConnectionError()
                await done
                assert.strictEqual(getClientState(client), ClientState.ShuttingDown)
                await clientStateIs(client, ClientState.Stopped, [])
            })

            it('continues after calling the errorHandler when the connection reports an error', async () => {
                const { unlock, done } = createWaiter()
                const { client, fireConnectionError } = await create({
                    error: () => {
                        unlock()
                        return ErrorAction.Continue
                    },
                    closed: () => {
                        throw new Error('unreachable')
                    },
                })
                fireConnectionError()
                await done
                assert.strictEqual(getClientState(client), ClientState.Active)
            })

            it('stops after calling the errorHandler close handler when the connection closes', async () => {
                const { unlock, done } = createWaiter()
                const { client, fireConnectionClose } = await create({
                    error: () => {
                        throw new Error('unreachable')
                    },
                    closed: () => {
                        unlock()
                        return CloseAction.DoNotReconnect
                    },
                })
                fireConnectionClose()
                await done
                await clientStateIs(client, ClientState.Stopped)
            })

            it('reconnects after calling the errorHandler close handler when the connection closes', async () => {
                const { unlock, done } = createWaiter()
                const { client, fireConnectionClose } = await create({
                    error: () => {
                        throw new Error('unreachable')
                    },
                    closed: () => {
                        unlock()
                        return CloseAction.Reconnect
                    },
                })
                fireConnectionClose()
                await done
                await clientStateIs(client, ClientState.Connecting)
            })
        })
    })
})