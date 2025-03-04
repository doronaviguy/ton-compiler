import {compileFunc, compilerVersion, SuccessResult, ErrorResult} from '../src/index';
import fs from 'fs';
import {Cell} from 'ton';

describe('ton-compiler', () => {
    const walletCodeCellHash = Buffer.from("hA3nAz+xEJePYGrDyjJ+BXBcxSp9Y2xaAFLRgGntfDs=", 'base64');

    const compilerVersionExpected = {
        funcVersion: "0.2.0",
        funcFiftLibCommitHash: "e2baac571836a464b5f8c2e53f72010a7169b052",
        funcFiftLibCommitDate: "2022-09-19 15:55:22 +0700"
    }

    it('should return compiler version', async () => {
        let version = await compilerVersion();
        expect(version).toEqual(compilerVersionExpected);
    });

    it('should compile', async () => {
        let result = await compileFunc({
            optLevel: 2,
            entryPoints: ["stdlib.fc", "wallet-code.fc"],
            sources: {
                "stdlib.fc": fs.readFileSync('./test/contracts/stdlib.fc', { encoding: 'utf-8' }),
                "wallet-code.fc":  fs.readFileSync('./test/contracts/wallet-code.fc', { encoding: 'utf-8' })
            }
        });

        expect(result.status).toEqual('ok');
        result = result as SuccessResult;

        let codeCell = Cell.fromBoc(Buffer.from(result.codeBoc, "base64"))[0];
        expect(codeCell.hash().equals(walletCodeCellHash)).toBe(true)
    });

    it('should handle includes', async () => {
        let result = await compileFunc({
            optLevel: 2,
            entryPoints: ["wallet-code.fc"],
            sources: {
                "stdlib.fc": fs.readFileSync('./test/contracts/stdlib.fc', { encoding: 'utf-8' }),
                "wallet-code.fc":  fs.readFileSync('./test/contracts/wallet-code-with-include.fc', { encoding: 'utf-8' })
            }
        });

        expect(result.status).toEqual('ok');

        result = result as SuccessResult;

        let codeCell = Cell.fromBoc(Buffer.from(result.codeBoc, "base64"))[0];
        expect(codeCell.hash().equals(walletCodeCellHash)).toBe(true)
    });

    it('should fail if entry point source is not provided', async () => {
        expect(compileFunc({
            optLevel: 2,
            entryPoints: ["main.fc"],
            sources: {
            }
        })).rejects.toThrowError('The entry point main.fc has not provided in sources.');
    });

    it('should handle pragma', async () => {
        let source = `
            #pragma version ^${compilerVersionExpected.funcVersion};
            
            () main() { return(); }
        `
        let result = await compileFunc({
            optLevel: 1,
            entryPoints: ["main.fc"],
            sources: {
                "main.fc": source,
            }
        });

        expect(result.status).toEqual('ok')

        source = `
            #pragma version <${compilerVersionExpected.funcVersion};
            
            () main() { return(); }
        `
        result = await compileFunc({
            optLevel: 1,
            entryPoints: ["main.fc"],
            sources: {
                "main.fc": source,
            }
        });

        expect(result.status).toEqual('error')
        result = result as ErrorResult;
        expect(result.message.indexOf(`FunC version ${compilerVersionExpected.funcVersion} does not satisfy condition <0.2.0`) != undefined);
    })
});