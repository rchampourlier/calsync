const Version = '1.0.0'

export function log(msg: string, ...args: any[]) {
  if (args.length > 0) console.log(`v${Version} -- ${(new Date()).toISOString()} -- ${msg}`, ...args)
  else console.log(`v${Version} -- ${(new Date()).toISOString()} -- ${msg}`)
}