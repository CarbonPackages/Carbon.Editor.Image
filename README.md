# Carbon.Editor.Image

Carbon.Editor.Image provides two Neos inspector editors for image properties:

- **FocalPoint** lets editors choose the focal point on an image.
- **Map** lets editors define clickable areas on an image, including a link and alternative text for each area.

The FocalPoint editor was inspired by
[Neos.ImageFocalPointEditor](https://github.com/jvm-tech/Neos.ImageFocalPointEditor/).

Both editors use the image selected in the configured image property. By default, they look for an `image` property on
the current node.

## Installation

Install the package in your Neos project with Composer:

```bash
composer require carbon/editor-image
```

## Usage

```yaml
Vendor.Site:Content.Image:
  properties:
    imageFocalPoint:
      # If `saveAsJsonString` is set to `true` in `editorOptions` or global configuration, set the property type to `string`
      type: array
      ui:
        # label: The label is optional; if omitted, it defaults to the translated text “Edit focal point”.
        inspector:
          editor: "Carbon.Editor.Image/FocalPoint"
    imageMap:
      # If `saveAsJsonString` is set to `true` in `editorOptions` or global configuration, set the property type to `string`
      type: array
      ui:
        # label: The label is optional; if omitted, it defaults to the translated text “Edit image map”.
        inspector:
          editor: "Carbon.Editor.Image/Map"
```

### FocalPoint

The FocalPoint editor displays the selected image and lets editors set its focal point. The value is stored as an object
with `x` and `y` coordinates.

### Map

The Map editor opens an image annotation dialog where editors can create and edit clickable areas. Each area can have a
link and alternative text. The editor saves the areas to the property.

## Global configuration

Default options for both editors are provided in `Configuration/Settings.Config.yaml` under
`Neos.Neos.Ui.frontendConfiguration`:

```yaml
Neos:
  Neos:
    Ui:
      frontendConfiguration:
        "Carbon.Editor.Image.FocalPoint":
          imageProperty: "image"
          labelIfEmpty: "Carbon.Editor.Image:Main:selectImage"
          saveAsJsonString: false
          openInDialog: true
        "Carbon.Editor.Image.Map":
          imageProperty: "image"
          labelIfEmpty: "Carbon.Editor.Image:Main:selectImage"
          saveAsJsonString: false
          linkEditor: "Neos.Neos/Inspector/Editors/LinkEditor"
          linkEditorOptions: {}
```

These are global defaults. Set an option in a property's `editorOptions` to override the global value for that editor
instance.

Available options:

| Option              | Description                                                                                                                                                                    |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `imageProperty`     | Name of the image property used by the editor. Defaults to `image`. Use `parent:propertyName` to read the image from the parent node.                                          |
| `labelIfEmpty`      | Text or translation key displayed when no image is selected. Set it to `null` to hide the editor output in that case.                                                          |
| `saveAsJsonString`  | When `true`, stores the value as a JSON string; the Neos property must then have `type: string`. When `false`, the value is stored as a native value, so use `type: array`.    |
| `openInDialog`      | FocalPoint editor only. When `true`, opens the focal point editor in a dialog like the Map editor. Changes are saved with Apply and discarded with Cancel. Defaults to `true`. |
| `linkEditor`        | Map editor only. Identifier of the Neos inspector editor used to edit area links.                                                                                              |
| `linkEditorOptions` | Map editor only. Options passed to the configured link editor.                                                                                                                 |

For example, to use a different image property only for one focal point field:

```yaml
editorOptions:
  imageProperty: "heroImage"
  labelIfEmpty: null
```

Property-level `editorOptions` take precedence over the corresponding global setting.

## Stored data format

### FocalPoint

The focal point is stored as `x` and `y` coordinates, expressed as percentages of the image dimensions:

```json
{
  "x": 30,
  "y": 28
}
```

### Map

The image map is stored as an array of areas. `shape` is either `rect` or `poly`, `chords` contains the area's
coordinates relative to the cropped output image, and `href` and `alt` hold the area's link and alternative text.

```json
[
  {
    "shape": "rect",
    "chords": "343,180,526,322",
    "href": "node://3211e0a0-4066-43f8-8f9c-6ff48a1017e4",
    "alt": "Website"
  },
  {
    "shape": "poly",
    "chords": "730,139,729,311,1065,362,1066,186,942,179",
    "href": "node://e69d08dd-d0e8-464b-8552-bf4707d4f682",
    "alt": ""
  }
]
```

These examples show the native values. When `saveAsJsonString` is `true`, the same data is stored as a JSON-encoded
string instead.
