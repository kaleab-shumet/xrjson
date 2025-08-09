import { parseXrjson } from '../src/index';

describe('xrjson complex tools structure', () => {
  test('handles complex tools array with empty literals section', () => {
    const xrjsonContent = `{
  "tools": [
    {
      "toolName": "read_files",
      "paths": ["f3.txt"]
    },
    {
      "toolName": "self_reason",
      "goal": "Recursively read files named inside each file until content is 'stop', collect all filenames, then delete all collected files and confirm completion.",
      "report": "I have called the read_files tool to open f3.txt as the next file named inside f1.txt to continue the recursive reading process until the content 'stop' is found.",
      "nextTasks": "1. Read f3.txt to get the next filename or 'stop'. 2. Continue recursively reading files named inside each file until 'stop' is found. 3. Collect all filenames opened. 4. Delete all collected files. 5. Use final tool to confirm completion.",
      "isAlone": false
    }
  ]
}
<literals>
</literals>`;

    const result = parseXrjson(xrjsonContent);
    
    expect(result).toHaveProperty('tools');
    expect(Array.isArray(result.tools)).toBe(true);
    expect(result.tools).toHaveLength(2);
    
    // Test first tool
    expect(result.tools[0]).toEqual({
      toolName: 'read_files',
      paths: ['f3.txt']
    });
    
    // Test second tool
    expect(result.tools[1].toolName).toBe('self_reason');
    expect(result.tools[1].goal).toContain('Recursively read files');
    expect(result.tools[1].report).toContain('I have called the read_files tool');
    expect(result.tools[1].nextTasks).toContain('1. Read f3.txt');
    expect(result.tools[1].isAlone).toBe(false);
    
    console.log('Complex tools structure parsed successfully!');
  });

  test('handles tools array with external references', () => {
    const xrjsonContent = `{
  "tools": [
    {
      "toolName": "create_file",
      "filename": "output.txt",
      "content": "xrjson('file_content')"
    },
    {
      "toolName": "self_reason",
      "goal": "Create a file with detailed content",
      "report": "xrjson('detailed_report')",
      "nextTasks": "File creation completed successfully"
    }
  ]
}
<literals>
  <literal id="file_content">This is a multi-line file content
that contains various information:
- File processing results
- Error handling details
- Performance metrics

Final status: Complete</literal>
  <literal id="detailed_report">I have successfully created the output.txt file with the following content:
1. Multi-line structured data
2. Performance and error information
3. Status confirmation

The file has been written to disk and is ready for use. All operations completed without errors.</literal>
</literals>`;

    const result = parseXrjson(xrjsonContent);
    
    expect(result.tools).toHaveLength(2);
    expect(result.tools[0].content).toContain('This is a multi-line file content');
    expect(result.tools[0].content).toContain('Final status: Complete');
    expect(result.tools[1].report).toContain('I have successfully created the output.txt file');
    expect(result.tools[1].report).toContain('All operations completed without errors');
    
    console.log('Tools with external references parsed successfully!');
  });

  test('handles nested objects in tools array', () => {
    const xrjsonContent = `{
  "tools": [
    {
      "toolName": "complex_operation",
      "config": {
        "settings": {
          "recursive": true,
          "depth": 5,
          "filters": ["*.txt", "*.md"]
        },
        "output": {
          "format": "json",
          "compress": false
        }
      },
      "metadata": {
        "created": "2024-01-01",
        "version": "1.0.0"
      }
    }
  ]
}
<literals>
</literals>`;

    const result = parseXrjson(xrjsonContent);
    
    expect(result.tools[0].config.settings.recursive).toBe(true);
    expect(result.tools[0].config.settings.depth).toBe(5);
    expect(result.tools[0].config.settings.filters).toEqual(['*.txt', '*.md']);
    expect(result.tools[0].config.output.format).toBe('json');
    expect(result.tools[0].metadata.version).toBe('1.0.0');
    
    console.log('Nested objects in tools parsed successfully!');
  });
});