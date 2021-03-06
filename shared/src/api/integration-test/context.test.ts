import { from } from 'rxjs'
import { distinctUntilChanged } from 'rxjs/operators'
import { ContextValues } from 'sourcegraph'
import { collectSubscribableValues, integrationTestContext } from './testHelpers'

describe('Context (integration)', () => {
    describe('internal.updateContext', () => {
        test('updates context', async () => {
            const { services, extensionHost } = await integrationTestContext()
            const values = collectSubscribableValues(from(services.context.data).pipe(distinctUntilChanged()))

            extensionHost.internal.updateContext({ a: 1 })
            await extensionHost.internal.sync()
            expect(values).toEqual([
                { 'clientApplication.isSourcegraph': true, 'clientApplication.extensionAPIVersion.major': 3 },
                { a: 1, 'clientApplication.isSourcegraph': true, 'clientApplication.extensionAPIVersion.major': 3 },
            ] as ContextValues[])
        })
    })
})
