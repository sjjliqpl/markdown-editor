import { useMemo } from 'react';

export interface TocItem {
  id: string;
  text: string;
  level: 1 | 2 | 3 | 4 | 5 | 6;
  index: number;       // position among all headings, for unique id generation
  lineNumber: number;  // 0-based line number in the source markdown
  charOffset: number;  // character offset of the heading line start in the source
}

/** Slugify heading text to a valid HTML id */
export function slugify(text: string, index: number): string {
  const slug = text
    .toLowerCase()
    .replace(/[\s]+/g, '-')
    .replace(/[^\w\u4e00-\u9fa5-]/g, '')
    .replace(/^-+|-+$/g, '');
  return slug ? `heading-${slug}-${index}` : `heading-${index}`;
}

/** Extract h1-h3 headings from markdown source */
export function useToc(markdown: string): TocItem[] {
  return useMemo(() => {
    const lines = markdown.split('\n');
    const items: TocItem[] = [];
    let index = 0;
    let inFence = false;
    let charOffset = 0;

    for (let lineNum = 0; lineNum < lines.length; lineNum++) {
      const line = lines[lineNum];

      // Track fenced code blocks
      if (/^```/.test(line.trim())) {
        inFence = !inFence;
        charOffset += line.length + 1; // +1 for '\n'
        continue;
      }
      if (inFence) {
        charOffset += line.length + 1;
        continue;
      }

      const match = line.match(/^(#{1,3})\s+(.+)/);
      if (match) {
        const level = match[1].length as 1 | 2 | 3;
        const rawText = match[2].replace(/\*\*|__|~~|`/g, '').trim();
        items.push({
          id: slugify(rawText, index),
          text: rawText,
          level,
          index,
          lineNumber: lineNum,
          charOffset,
        });
        index++;
      }

      charOffset += line.length + 1;
    }
    return items;
  }, [markdown]);
}

