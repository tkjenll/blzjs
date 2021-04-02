export interface MessageResponse<T> {
    height: number
    txhash: string
    data: T[]
}

export interface TxCountResponse {
    count: string
}

export interface TxGetLeaseResponse {
    key: string
    lease: string
}

export interface TxHasResponse {
    key: string
    has: boolean
}

export interface TxKeysResponse {
    keys: string[]
}

export interface TxKeyValuesResponse {
    keyvalues: {key: string, value: string}[]
}

export interface TxReadResponse {
    value: string
    key: string
}

