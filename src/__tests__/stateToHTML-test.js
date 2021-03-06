/* @flow */
const {describe, it} = global;
import expect from 'expect';
import {convertFromRaw} from 'draft-js';
import stateToHTML from '../stateToHTML';
import fs from 'fs';
import {join} from 'path';

// This separates the test cases in `data/test-cases.txt`.
const SEP = '\n\n#';

let testCasesRaw = fs.readFileSync(
  join(__dirname, '..', '..', 'test', 'test-cases.txt'),
  'utf8',
);

// These test cases specify custom options also.
let testCasesCustomRaw = fs.readFileSync(
  join(__dirname, '..', '..', 'test', 'test-cases-custom.txt'),
  'utf8',
);

let testCases = testCasesRaw.slice(1).trim().split(SEP).map((text) => {
  let lines = text.split('\n');
  let description = lines.shift().trim();
  let state = JSON.parse(lines.shift());
  let html = lines.join('\n');
  return {description, state, html};
});

let testCasesCustom = testCasesCustomRaw.slice(1).trim().split(SEP).map((text) => {
  let lines = text.split('\n');
  let description = lines.shift().trim();
  let options = JSON.parse(lines.shift());
  let state = JSON.parse(lines.shift());
  let html = lines.join('\n');
  return {description, options, state, html};
});

describe('stateToHTML', () => {
  testCases.forEach((testCase) => {
    let {description, state, html} = testCase;
    it(`should render ${description}`, () => {
      let contentState = convertFromRaw(state);
      expect(stateToHTML(contentState)).toBe(html);
    });
  });

  testCasesCustom.forEach((testCase) => {
    let {description, options, state, html} = testCase;
    it(`should render ${description}`, () => {
      let contentState = convertFromRaw(state);
      expect(stateToHTML(contentState, options)).toBe(html);
    });
  });

  it('should support custom block renderer', () => {
    let options = {
      blockRenderers: {
        'code-block': (block) => {
          return `<div class="code">${block.getText()}</div>`;
        },
      },
    };
    let contentState = convertFromRaw(
      // <pre><code>Hello <em>world</em>.</code></pre>
      {"entityMap":{},"blocks":[{"key":"dn025","text":"Hello world.","type":"code-block","depth":0,"inlineStyleRanges":[{"offset":6,"length":5,"style":"ITALIC"}],"entityRanges":[]}]} // eslint-disable-line
    );
    expect(stateToHTML(contentState, options)).toBe(
      '<div class="code">Hello world.</div>'
    );
    let contentState2 = convertFromRaw(
      // <h1>Hello <em>world</em>.</h1>
      {"entityMap":{},"blocks":[{"key":"dn025","text":"Hello world.","type":"header-one","depth":0,"inlineStyleRanges":[{"offset":6,"length":5,"style":"ITALIC"}],"entityRanges":[]}]} // eslint-disable-line
    );
    expect(stateToHTML(contentState2, options)).toBe(
      '<h1>Hello <em>world</em>.</h1>'
    );
  });

  it('should support custom block styles', () => {
    let options = {
      blockStyleFn: (block) => {
        let alignment = block.getData ? block.getData().get('alignment') : null;
        if (alignment) {
          return {
            style: {
              textAlign: alignment,
            },
          };
        }
      },
    };
    let contentState1 = convertFromRaw(
      // <h1 style="text-align: left;">Hello <em>world</em>.</h1>
      {"entityMap":{},"blocks":[{"data":{"alignment":"left"},"key":"dn025","text":"Hello world.","type":"header-one","depth":0,"inlineStyleRanges":[{"offset":6,"length":5,"style":"ITALIC"}],"entityRanges":[]}]} // eslint-disable-line
    );
    if (contentState1.getFirstBlock().getData == null) {
      // Older DraftJS does not support block.getData()
      return;
    }
    expect(stateToHTML(contentState1, options)).toBe(
      '<h1 style="text-align: left">Hello <em>world</em>.</h1>'
    );
    let contentState2 = convertFromRaw(
      // <h1>Hello <em>world</em>.</h1>
      {"entityMap":{},"blocks":[{"key":"dn025","text":"Hello world.","type":"header-one","depth":0,"inlineStyleRanges":[{"offset":6,"length":5,"style":"ITALIC"}],"entityRanges":[]}]} // eslint-disable-line
    );
    expect(stateToHTML(contentState2, options)).toBe(
      '<h1>Hello <em>world</em>.</h1>'
    );
  });

  it('should support optional pretty-printing unstyled text', () => {
    let contentState = convertFromRaw({"entityMap":{},"blocks":[{"key":"b4nv7","text":"a","type":"unstyled","depth":0,"inlineStyleRanges":[],"entityRanges":[],"data":{}},{"key":"klgb","text":"b","type":"unstyled","depth":0,"inlineStyleRanges":[],"entityRanges":[],"data":{}}]}); // eslint-disable-line
    expect(stateToHTML(contentState, {prettyPrint: true})).toBe('<p>a</p>\n<p>b</p>');
    expect(stateToHTML(contentState, {prettyPrint: false})).toBe('<p>a</p><p>b</p>');
  })

  it('should support optional pretty-printing lists', () => {
    let contentState = convertFromRaw({"entityMap":{},"blocks":[{"key":"33nh8","text":"An ordered list:","type":"unstyled","depth":0,"inlineStyleRanges":[],"entityRanges":[]},{"key":"8kinl","text":"One","type":"ordered-list-item","depth":0,"inlineStyleRanges":[],"entityRanges":[]},{"key":"ekll4","text":"Two","type":"ordered-list-item","depth":0,"inlineStyleRanges":[],"entityRanges":[]}]});
    expect(stateToHTML(contentState, {prettyPrint: true}))
      .toBe('<p>An ordered list:</p>\n<ol>\n  <li>One</li>\n  <li>Two</li>\n</ol>');
    expect(stateToHTML(contentState, {prettyPrint: false}))
      .toBe('<p>An ordered list:</p><ol><li>One</li><li>Two</li></ol>');
  })
});
