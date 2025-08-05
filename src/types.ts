export interface Literal {
  id: string;
  content: string;
}

export interface LiteralsMap {
  [id: string]: string;
}

export interface XrjsonParseResult {
  jsonContent: string;
  xmlContent: string;
}

export class XrjsonError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'XrjsonError';
  }
}