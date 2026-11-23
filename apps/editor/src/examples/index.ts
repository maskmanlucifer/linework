import type { Doc } from '@maskmanlucifer/linework';
import { hashTable } from './hashTable';
import { memoryStack } from './memoryStack';
import { requestFlow } from './requestFlow';

/** Built-in example drawings, shown in the Examples menu. */
export const examples: { name: string; doc: Doc }[] = [
  { name: 'Hash table', doc: hashTable },
  { name: 'Memory stack', doc: memoryStack },
  { name: 'Request flow', doc: requestFlow },
];
