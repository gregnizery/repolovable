const fs = require('fs');
const { SourceMapConsumer } = require('source-map');

const rawSourceMap = JSON.parse(fs.readFileSync('./dist/assets/index-DInksinT.js.map', 'utf8'));

SourceMapConsumer.with(rawSourceMap, null, consumer => {
  const lines = [
    { line: 836, column: 127844 }, // q7
    { line: 38, column: 17031 }, // kk
    { line: 40, column: 44104 }, // wz
  ];

  for (const pos of lines) {
    console.log(consumer.originalPositionFor(pos));
  }
}).catch(console.error);
