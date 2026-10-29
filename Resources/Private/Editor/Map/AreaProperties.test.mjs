import assert from "node:assert/strict";
import { test } from "node:test";
import { getAreaProperties, getAreaData } from "./AreaProperties.js";

test("overrides and adds fields while omitting null fields", () => {
    const text = {
        editor: "TextEditor",
        editorOptions: { placeholder: "Title" },
    };
    const properties = getAreaProperties(
        { href: { editor: "LinkEditor" }, alt: text },
        { alt: null, title: text },
    );
    assert.deepEqual(Object.keys(properties), ["href", "title"]);
    assert.equal(properties.title, text);
    assert.deepEqual(
        getAreaData(
            {
                href: "node://example",
                alt: "Hidden",
                title: "Title",
                old: "Unused",
            },
            properties,
        ),
        { href: "node://example", title: "Title" },
    );
    assert.deepEqual(getAreaData({}, properties), { href: "", title: "" });
});

test("preserves non-string values and supports no fields", () => {
    const properties = getAreaProperties(
        {},
        {
            enabled: { editor: "BooleanEditor" },
            count: { editor: "NumberEditor" },
            items: { editor: "SelectBoxEditor" },
        },
    );
    const data = { enabled: false, count: 0, items: ["one", "two"] };
    assert.deepEqual(getAreaData(data, properties), data);
    assert.deepEqual(getAreaData(data, {}), {});
});

test("rejects reserved fields and invalid editor definitions", () => {
    assert.throws(
        () => getAreaProperties({ coords: { editor: "TextEditor" } }),
        /reserved/,
    );
    assert.throws(
        () => getAreaProperties({ shape: { editor: "TextEditor" } }),
        /reserved/,
    );
    assert.throws(() => getAreaProperties({ title: {} }), /requires an editor/);
});
