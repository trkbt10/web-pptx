/** @file Sub-document extractor tests */
import {
  textRangeToParagraphs,
  parsePlcfHdd,
  extractHeadersFooters,
  parseBookmarkNames,
  extractBookmarks,
  extractNotes,
} from "./subdoc-extractor";

describe("textRangeToParagraphs", () => {
  it("extracts paragraphs from text range", () => {
    const text = "Hello\rWorld\rEnd";
    const paras = textRangeToParagraphs(text, 0, 11);
    expect(paras).toHaveLength(2);
    expect(paras[0].runs[0].text).toBe("Hello");
    expect(paras[1].runs[0].text).toBe("World");
  });

  it("returns empty for empty range", () => {
    expect(textRangeToParagraphs("text", 5, 5)).toEqual([]);
  });
});

describe("parsePlcfHdd", () => {
  it("returns empty for lcb=0", () => {
    expect(parsePlcfHdd(new Uint8Array(10), 0, 0)).toEqual([]);
  });

  it("parses CP array", () => {
    const data = new Uint8Array(16);
    const view = new DataView(data.buffer);
    view.setInt32(0, 0, true);
    view.setInt32(4, 10, true);
    view.setInt32(8, 20, true);
    view.setInt32(12, 30, true);

    const cps = parsePlcfHdd(data, 0, 16);
    expect(cps).toEqual([0, 10, 20, 30]);
  });
});

describe("extractHeadersFooters", () => {
  it("extracts odd header from section 1", () => {
    // 6 separator stories + 6 section stories
    // Create CPs for 12 entries + 1 boundary = 13 CPs
    const hddCps = [
      0, 0, 0, 0, 0, 0, // separators (skip)
      0, 0, 10, 10, 10, 10, 10, // section: even-hdr(0-0), odd-hdr(0-10), even-ftr(10-10), ...
    ];
    const fullText = "OddHeader\r";
    const hdrTextStart = 0;

    const { headers, footers } = extractHeadersFooters(hddCps, fullText, hdrTextStart);
    expect(headers).toHaveLength(1);
    expect(headers[0].type).toBe("odd");
    expect(headers[0].content[0].runs[0].text).toBe("OddHeader");
    expect(footers).toHaveLength(0);
  });
});

describe("parseBookmarkNames", () => {
  it("returns empty for lcb=0", () => {
    expect(parseBookmarkNames(new Uint8Array(10), 0, 0)).toEqual([]);
  });

  it("parses bookmark names from STTB", () => {
    // STTB: fExtend=0xFFFF, cData=2, cbExtra=0, entries
    const name1 = "Bookmark1";
    const name2 = "BM2";

    const headerSize = 6;
    const entry1Size = 2 + name1.length * 2;
    const entry2Size = 2 + name2.length * 2;
    const totalSize = headerSize + entry1Size + entry2Size;

    const data = new Uint8Array(totalSize);
    const view = new DataView(data.buffer);

    view.setUint16(0, 0xffff, true);
    view.setUint16(2, 2, true);
    view.setUint16(4, 0, true);

    // Entry 1
    let offset = 6;
    view.setUint16(offset, name1.length, true);
    offset += 2;
    for (let i = 0; i < name1.length; i++) {
      view.setUint16(offset + i * 2, name1.charCodeAt(i), true);
    }
    offset += name1.length * 2;

    // Entry 2
    view.setUint16(offset, name2.length, true);
    offset += 2;
    for (let i = 0; i < name2.length; i++) {
      view.setUint16(offset + i * 2, name2.charCodeAt(i), true);
    }

    const names = parseBookmarkNames(data, 0, totalSize);
    expect(names).toEqual(["Bookmark1", "BM2"]);
  });
});

describe("extractBookmarks", () => {
  it("combines names, starts, and ends", () => {
    const names = ["BM1", "BM2"];
    const starts = [
      { cp: 10, ibkl: 0 },
      { cp: 50, ibkl: 1 },
    ];
    const endCps = [20, 60];

    const bookmarks = extractBookmarks(names, starts, endCps);
    expect(bookmarks).toHaveLength(2);
    expect(bookmarks[0]).toEqual({ name: "BM1", cpStart: 10, cpEnd: 20 });
    expect(bookmarks[1]).toEqual({ name: "BM2", cpStart: 50, cpEnd: 60 });
  });
});

describe("extractNotes", () => {
  it("extracts notes from CP ranges", () => {
    const refCps = [5, 15]; // 1 note, reference at cp 5
    const textCps = [0, 10]; // Note text at offset 0..10
    const fullText = "NoteText\r ";
    const notes = extractNotes(refCps, textCps, fullText, 0);

    expect(notes).toHaveLength(1);
    expect(notes[0].cpRef).toBe(5);
    expect(notes[0].content[0].runs[0].text).toBe("NoteText");
  });
});
