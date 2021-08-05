import {expect} from 'chai'
import {API} from "../../../../lib/API";

import {useChaiAsPromised} from "testing/lib/globalHelpers";
import {DEFAULT_TIMEOUT, getPrintableChars} from "testing/lib/helpers/testHelpers";
import * as fs from "fs";
import {createKeys} from "../../../../../examples/performance/utils";
import {defaultGasParams, defaultLease, sentryWithClient} from "../../../helpers/client-helpers";


describe('create()', function () {
    this.timeout(DEFAULT_TIMEOUT);

    let bz: API;

    beforeEach(async () => {
        useChaiAsPromised();
        bz = await sentryWithClient();
    });

    // it('should return chain info', async () => {
    //     const result = await bz.create('key', 'value', defaultGasParams());
    //     expect(result.height).to.be.a('number');
    //     expect(result.txhash).to.be.a('string');
    //     //expect(result.gasWanted).to.be.a('number');
    //     //expect(result.gasUsed).to.be.a('number');
    // })

    it('should be able to store an empty value', async () => {
        await bz.create('key', '', defaultGasParams(), defaultLease)
        expect(await bz.read('key')).to.equal('');
    })

    it.skip('should handle large documents', async () => {
        const json = fs.readFileSync(`${__dirname}/large-doc.json`).toString();
        await bz.create('key', json, defaultGasParams(), defaultLease);
        expect(await bz.read('key')).to.equal(json);
    })

    // it('should handle long keys', async () => {
    //     const longKey = '0123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890'
    //     await bz.create(longKey, 'value', defaultGasParams())
    //     expect((await bz.keys())[0]).to.equal(longKey)
    //     expect(await bz.read(longKey)).to.equal('value');
    // })

    // it('should handle keys with symbols', async function () {
    //     const symbols = getPrintableChars();
    //     await bz.create(symbols, 'value', defaultLease);
    //     expect(await bz.keys()).to.contain(symbols);
    //     expect(await bz.read(symbols)).to.equal('value');
    // });

    it('should throw an error if key is empty', async () => {
        await expect(bz.create('', 'xx', defaultGasParams(), defaultLease))
            .to.be.rejectedWith('Key cannot be empty');
    })

    it('should handle values with symbols', async () => {
        const symbols = getPrintableChars();
        await bz.create('a-key', symbols, defaultGasParams(), defaultLease)
        expect(await bz.read('a-key')).to.equal(symbols);
    });

    it('should create a key with value in the database', async () => {
        await bz.create('myKey', 'someValue', defaultGasParams(), defaultLease);
        expect(await bz.read('myKey')).to.equal('someValue');
    });

    it('should throw an error if a key already exists and not update the value', async () => {
        await bz.create('myKey', 'firstValue',defaultGasParams(), defaultLease)
            .then(async () => expect(await bz.read('myKey')).to.equal('firstValue'));

        await bz.create('myKey', 'secondValue', defaultGasParams(), defaultLease)
            .catch(e => expect(e.error).to.match(/key already exists/));
    });

    // it('should handle creates that are sent simultaneously', async () => {
    //     const bz2 = bluzelle({
    //         mnemonic: bz.generateBIP39Account(),
    //         uuid: bz.uuid,
    //         endpoint: bz.url
    //     })
    //
    //     await bz.transferTokensTo(bz2.address, 10000, defaultGasParams())
    //
    //
    //     let caught = false;
    //
    //     await Promise.all([
    //         bz.create('foo', 'bar1', defaultGasParams()).catch(e => {
    //             expect(e.error).to.equal('Key already exists')
    //             caught = true;
    //         }),
    //         bz2.create('foo', 'bar2', defaultGasParams()).catch(e => {
    //             expect(e.error).to.match(/Key already exists/)
    //             caught = true;
    //         })
    //     ])
    //     expect(caught).to.be.true;
    // });

    // it('should throw an error if assigned insufficient gas price', async () => {
    //     expect(
    //         await bz.create('myKey', 'myValue', {gas_price: .0001}).catch(e => e.error)
    //     ).to.equal('insufficient fees');
    // });
    //
    // it('should throw an error if assigned insufficient gas', async () => {
    //     expect(
    //         await bz.create('myKey', 'myValue', {max_gas: 1}).catch(e => e.error)
    //     ).to.equal('insufficient fees');
    // });

    it.skip('should throw an error if assigned insufficient max fee', async () => {
        expect(
            await bz.create('myKey', 'myValue', defaultGasParams(), defaultLease).catch(e => e.error)
        ).to.equal('insufficient fees');
    });


    it('should throw an error if the key is not a string', async () => {
        // @ts-ignore
        await expect(bz.create(10, '20', defaultLease)).to.be.rejectedWith(Error, 'Key must be a string');
    })

    it.skip('should throw an error if the value is not a string', async () => {
        // @ts-ignore - testing bad param
        await expect(bz.create('aKey', 10, defaultLease)).to.be.rejectedWith(Error, 'Value must be a string');
    })

    it('should throw an error if the lease time is less than 0', async () => {
        await expect(bz.create('aKey', 'aValue', defaultGasParams(), {...defaultLease, days: -2})).to.be.rejectedWith('Invalid lease time');
    })

    it.skip('should default to 10 days if lease time is 0 or unspecified', async () => {

    })

    it('can store json', async () => {
        const json = JSON.stringify({foo: 10, bar: 'baz', t: true, arr: [1, 2, 3]});
        await bz.create('key', json, defaultGasParams(), defaultLease)
        expect(await bz.read('key')).to.equal(json);
    });

    it('can handle multiple creates', () =>
        Promise.all([
            bz.create('foo1', 'bar1', defaultGasParams(), defaultLease),
            bz.create('foo2', 'bar2', defaultGasParams(), defaultLease),
            bz.create('foo3', 'bar3',defaultGasParams(), defaultLease),
            bz.create('foo4', 'bar4', defaultGasParams(), defaultLease),
        ])
            .then(x => x)
            .then(() => Promise.all([
                bz.read('foo1'),
                bz.read('foo2'),
                bz.read('foo3'),
                bz.read('foo4'),
            ]))
            .then(responses => expect(responses).to.deep.equal(['bar1', 'bar2', 'bar3', 'bar4']))
    );



});


