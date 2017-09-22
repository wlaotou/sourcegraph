import { RouteComponentProps } from 'react-router'
import { makeRepoURI, ParsedRepoURI } from '../repo'
import { parseHash } from './url'

// the typed parameters are not useful in the parsed props, as you shouldn't use them
export interface ParsedRouteProps extends Partial<ParsedRepoURI>, RouteComponentProps<any> {
    routeName?: 'editor-auth' | 'home' | 'repository' | 'search' | 'sign-in' | 'user-profile'
    uri?: string
}

export function parseRouteProps<T extends string | {[key: string]: string} | string[]>(props: RouteComponentProps<T>): ParsedRouteProps {
    switch (props.location.pathname) {
        case '/':               return { ...props, routeName: 'home' }
        case '/editor-auth':    return { ...props, routeName: 'editor-auth' }
        case '/search':         return { ...props, routeName: 'search' }
        case '/settings':       return { ...props, routeName: 'user-profile' }
        case '/sign-in':        return { ...props, routeName: 'sign-in' }
    }

    const uriPathSplit = props.match.params[0].split('/-/')
    const repoRevSplit = uriPathSplit[0].split('@')
    const hash = parseHash(props.location.hash)
    const position = hash.line ? { line: hash.line, character: hash.character || 0 } : undefined
    const repoParams = { ...props, repoPath: repoRevSplit[0], rev: repoRevSplit[1], position }
    if (uriPathSplit.length === 1) {
        return {...repoParams, routeName: 'repository' as 'repository', uri: makeRepoURI(repoParams)}
    }
    const repoSubPaths = uriPathSplit[1].split('/')
    const repoSubRoute = repoSubPaths[0]
    const filePath = repoSubPaths.slice(1).join('/')
    const repoParamsWithPath = { ...repoParams, filePath }
    if (repoSubRoute !== 'blob' && repoSubRoute !== 'tree') {
        return {...repoParamsWithPath, uri: makeRepoURI(repoParams)}
    }
    return {...repoParamsWithPath, routeName: 'repository' as 'repository', uri: makeRepoURI(repoParams)}
}
