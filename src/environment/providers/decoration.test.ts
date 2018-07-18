import * as assert from 'assert'
import { of } from 'rxjs'
import { TestScheduler } from 'rxjs/testing'
import { Position } from 'vscode-languageserver-types'
import { TextDocumentDecoration, TextDocumentDecorationParams } from '../../protocol'
import { getDecorations, ProvideTextDocumentDecorationSignature } from './decoration'
import { FIXTURE as COMMON_FIXTURE } from './textDocument.test'

// const DELAY = 100 // msec

const FIXTURE = {
    ...COMMON_FIXTURE,
    TextDocumentDecorationParams: { textDocument: { uri: 'file:///f' } } as TextDocumentDecorationParams,
}

const FIXTURE_RESULT: TextDocumentDecoration[] | null = [
    {
        range: { start: Position.create(1, 2), end: Position.create(3, 4) },
        backgroundColor: 'red',
    },
]

const scheduler = () => new TestScheduler((a, b) => assert.deepStrictEqual(a, b))

describe('getDecorations', () => {
    describe('0 providers', () => {
        it('returns null', () =>
            scheduler().run(({ cold, expectObservable }) =>
                expectObservable(
                    getDecorations(
                        cold<ProvideTextDocumentDecorationSignature[]>('-a-|', { a: [] }),
                        FIXTURE.TextDocumentDecorationParams
                    )
                ).toBe('-a-|', {
                    a: null,
                })
            ))
    })

    describe('1 provider', () => {
        it('returns null result from provider', () =>
            scheduler().run(({ cold, expectObservable }) =>
                expectObservable(
                    getDecorations(
                        cold<ProvideTextDocumentDecorationSignature[]>('-a-|', { a: [() => of(null)] }),
                        FIXTURE.TextDocumentDecorationParams
                    )
                ).toBe('-a-|', {
                    a: null,
                })
            ))

        it('returns result from provider', () =>
            scheduler().run(({ cold, expectObservable }) =>
                expectObservable(
                    getDecorations(
                        cold<ProvideTextDocumentDecorationSignature[]>('-a-|', {
                            a: [() => of(FIXTURE_RESULT)],
                        }),
                        FIXTURE.TextDocumentDecorationParams
                    )
                ).toBe('-a-|', {
                    a: FIXTURE_RESULT,
                })
            ))
    })

    describe('2 providers', () => {
        it('returns null result if both providers return null', () =>
            scheduler().run(({ cold, expectObservable }) =>
                expectObservable(
                    getDecorations(
                        cold<ProvideTextDocumentDecorationSignature[]>('-a-|', {
                            a: [() => of(null), () => of(null)],
                        }),
                        FIXTURE.TextDocumentDecorationParams
                    )
                ).toBe('-a-|', {
                    a: null,
                })
            ))

        it('omits null result from 1 provider', () =>
            scheduler().run(({ cold, expectObservable }) =>
                expectObservable(
                    getDecorations(
                        cold<ProvideTextDocumentDecorationSignature[]>('-a-|', {
                            a: [() => of(FIXTURE_RESULT), () => of(null)],
                        }),
                        FIXTURE.TextDocumentDecorationParams
                    )
                ).toBe('-a-|', {
                    a: FIXTURE_RESULT,
                })
            ))

        it('merges results from providers', () =>
            scheduler().run(({ cold, expectObservable }) =>
                expectObservable(
                    getDecorations(
                        cold<ProvideTextDocumentDecorationSignature[]>('-a-|', {
                            a: [() => of(FIXTURE_RESULT), () => of(FIXTURE_RESULT)],
                        }),
                        FIXTURE.TextDocumentDecorationParams
                    )
                ).toBe('-a-|', {
                    a: [...FIXTURE_RESULT!, ...FIXTURE_RESULT!],
                })
            ))
    })

    describe('multiple emissions', () => {
        it('returns stream of results', () =>
            scheduler().run(({ cold, expectObservable }) =>
                expectObservable(
                    getDecorations(
                        cold<ProvideTextDocumentDecorationSignature[]>('-a-b-|', {
                            a: [() => of(FIXTURE_RESULT)],
                            b: [() => of(null)],
                        }),
                        FIXTURE.TextDocumentDecorationParams
                    )
                ).toBe('-a-b-|', {
                    a: FIXTURE_RESULT,
                    b: null,
                })
            ))
    })
})