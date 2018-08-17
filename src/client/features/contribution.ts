import uuidv4 from 'uuid/v4'
import {
    ContributionRegistry,
    ContributionsEntry,
    ContributionUnsubscribable,
} from '../../environment/providers/contribution'
import { MessageType as RPCMessageType } from '../../jsonrpc2/messages'
import { ClientCapabilities, Contributions, ServerCapabilities } from '../../protocol'
import { DynamicFeature, ensure, RegistrationData } from './common'

/**
 * Support for user-facing features contributed by the server for use and display in the client's application.
 */
export class ContributionFeature implements DynamicFeature<Contributions> {
    private contributions = new Map<string, ContributionUnsubscribable>()

    constructor(private registry: ContributionRegistry) {}

    public get messages(): RPCMessageType {
        // This method is not actually a protocol method, but some value is required here because the client tracks
        // DynamicFeatures based on their method name.
        return { method: 'window/contribution' }
    }

    public fillClientCapabilities(capabilities: ClientCapabilities): void {
        ensure(ensure(capabilities, 'window')!, 'contribution')!.dynamicRegistration = true
    }

    public initialize(capabilities: ServerCapabilities): void {
        if (!capabilities.contributions) {
            return
        }
        this.register(this.messages, {
            id: uuidv4(),
            registerOptions: capabilities.contributions,
        })
    }

    public register(_message: RPCMessageType, data: RegistrationData<Contributions>): void {
        const existing = this.contributions.get(data.id)
        if (existing && !data.overwriteExisting) {
            throw new Error(`registration already exists with ID ${data.id}`)
        }
        const entry: ContributionsEntry = { contributions: data.registerOptions }
        let subscription: ContributionUnsubscribable
        if (data.overwriteExisting) {
            if (!existing) {
                throw new Error(`no existing registration to overwrite with ID ${data.id}`)
            }
            subscription = this.registry.replaceContributions(existing, entry)
        } else {
            subscription = this.registry.registerContributions(entry)
        }
        this.contributions.set(data.id, subscription)
    }

    public unregister(id: string): void {
        const sub = this.contributions.get(id)
        if (!sub) {
            throw new Error(`no registration with ID ${id}`)
        }
        sub.unsubscribe()
        this.contributions.delete(id)
    }

    public unregisterAll(): void {
        for (const sub of this.contributions.values()) {
            sub.unsubscribe()
        }
        this.contributions.clear()
    }
}