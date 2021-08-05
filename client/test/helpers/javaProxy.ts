import {API, } from "../../lib/API";

import {clientProxyFactory} from "./clientProxyFactory";
import axios from 'axios';
import {deleteProxyContainer, startProxyContainer} from "./dockerfiles/DockerManager";
import {serializeRequests, waitForProxyUp} from "./client-helpers";
import {BluzelleConfig} from "../../lib/types/BluzelleConfig";

export const javaProxy = async (bz: API, bluzelleConfig: BluzelleConfig): Promise<API> => {
console.log(bluzelleConfig);
const env = {
        MNEMONIC: bluzelleConfig.mnemonic,
        ENDPOINT: bluzelleConfig.endpoint,
        UUID: bluzelleConfig.uuid
    } as any

    await deleteProxyContainer('java');
    await startProxyContainer('java', env);
    await waitForProxyUp(5000);

    return clientProxyFactory(bz, executeBluzelleMethod) as API;

    function executeBluzelleMethod (method: string, args: string[]) {
        return serializeRequests(() => axios.post('http://localhost:5000', {method: method, args}))
            .then(res => res.data)
            .then((data) => data === null ? undefined : data)
            .catch((err) => {
                const msg = err.response.data.raw_log || err.response.data.error || err.response.data;
                console.log(msg);
                throw new Error(msg)
            })
    }
};


