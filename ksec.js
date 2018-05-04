#!/usr/bin/env node
'use strict'

const meow = require('meow')
const execa = require('execa')
const tempy = require('tempy')
const fs = require('fs')

const args = meow(
    `
	Usage
	  $ ksec <secretname> <key1>=<value1> <key2>=<value2>

	Options
	  --namespace, -n  target namespace

	Examples
	  $ ksec mysecret a=b c=d -n dev
	  secret "mysecret" created
`,
    { flags: { namespace: { type: 'string', alias: 'n' } } }
)

async function checkKubectl() {
    try {
        await execa('kubectl')
        return true
    } catch (err) {
        return false
    }
}

async function createSecret(args) {
    try {
        const { input, flags } = args
        const exists = await checkKubectl()
        if (!exists) {
            throw new Error('kubectl not installed')
        }

        let kubeArgs = ['create', 'secret', 'generic', input[0]]

        for (let i =1; i < input.length; i += 1) {
            const [ key, val ] = input[i].split('=')
            const filePath = tempy.file({ name: key })
            fs.writeFileSync(filePath, val)
            kubeArgs.push(`--from-file=${filePath}`)
        }

        if (flags.namespace) {
            kubeArgs.push('--namespace')
            kubeArgs.push(flags.namespace)
        }

        const cmd = execa('kubectl', kubeArgs)
        cmd.stdout.pipe(process.stdout)
        cmd.stderr.pipe(process.stderr)
    } catch (err) {
        console.log('error while creating secret', err)
    }
}

;(function ksec() {
    const { input, flags } = args
    if (input.length === 0) {
        throw new Error('secret name is required')
    }

    createSecret(args)
})()
