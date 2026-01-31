declare module '@jest/globals' {
  export function describe(...args: any[]): any
  export function it(...args: any[]): any
  export function expect(...args: any[]): any
  export function beforeEach(...args: any[]): any
  export const jest: any
}
