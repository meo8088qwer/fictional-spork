import assert from 'node:assert/strict';
import { parseRoster } from '../src/lib/excelHelper';

const rows = parseRoster('이름\t학년\n김민수 초3\n이서연\t초등 1학년\n박지훈 7세\n최유나\n\n김민수 초5\n정하늘, 6학년', '초등 2학년');
assert.deepEqual(rows, [
  { name: '김민수', grade: '초등 3학년' },
  { name: '이서연', grade: '초등 1학년' },
  { name: '박지훈', grade: '유치부 7세' },
  { name: '최유나', grade: '초등 2학년' },
  { name: '정하늘', grade: '초등 6학년' },
]);
assert.deepEqual(parseRoster('   \n\n', '초등 3학년'), []);
console.log('parseRoster ok');
