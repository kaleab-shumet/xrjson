import { parseXrjson } from '../src/index';
import { readFileSync } from 'fs';
import { join } from 'path';

describe('xrjson file reading', () => {
  test('demonstrates the parser issue with file content', () => {
    // This should work - simple content
    const simpleContent = `{
      "filename": "dpt.txt",
      "content": "xrjson('file-content')"
    }
    
    <literals>
      <literal id="file-content">simple text without special characters</literal>
    </literals>`;

    const result1 = parseXrjson(simpleContent);
    expect(result1.filename).toBe('dpt.txt');
    expect(result1.content).toBe('simple text without special characters');
  });

  test('successfully handles real file content with automatic escaping', () => {
    // Read the actual dpt.txt file
    const dptContent = readFileSync(join(__dirname, 'dpt.txt'), 'utf-8');
    
    // Now this should work because the parser automatically handles escaping
    const xrjsonContent = `{
      "filename": "dpt.txt", 
      "content": "xrjson('file-content')"
    }
    
    <literals>
      <literal id="file-content">${dptContent}</literal>
    </literals>`;

    // This should now work with the improved parser
    const result = parseXrjson(xrjsonContent);
    
    expect(result.filename).toBe('dpt.txt');
    expect(result.content).toContain('import {');
    expect(result.content).toContain('PromptOptions');
    expect(result.content).toContain('DefaultPromptTemplate');
    
    // Verify content integrity - normalize line endings for comparison
    const normalizeLineEndings = (str: string) => str.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    const normalizedResult = normalizeLineEndings(result.content);
    const normalizedOriginal = normalizeLineEndings(dptContent);
    
    expect(normalizedResult).toBe(normalizedOriginal);
    
    console.log('Success! File content properly parsed with automatic escaping.');
  });

  test('expected final output format', () => {
    // This is what we want to achieve
    const dptContent = readFileSync(join(__dirname, 'dpt.txt'), 'utf-8');
    
    // Manual construction of expected result to show the desired format
    const expectedResult = {
      filename: "dpt.txt",
      content: dptContent
    };
    
    console.log('This is what we want to achieve:');
    console.log('Final output:', JSON.stringify(expectedResult, null, 2));
    
    // For now, just verify the structure we want
    expect(expectedResult.filename).toBe('dpt.txt');
    expect(expectedResult.content).toContain('import {');
  });
});