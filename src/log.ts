export function log(msg: string, args?: any) {
  if (args !== undefined) console.log(`${(new Date()).toISOString()} -- ${msg}`, ...args)
  else console.log(`${(new Date()).toISOString()} -- ${msg}`)
}