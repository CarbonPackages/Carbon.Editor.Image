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
          areaProperties:
            href:
              label: "Carbon.Editor.Image:Main:map.link"
              editor: "Neos.Neos/Inspector/Editors/LinkEditor"
              editorOptions: {}
            title:
              label: "Carbon.Editor.Image:Main:map.title"
              editor: "Neos.Neos/Inspector/Editors/TextFieldEditor"
              editorOptions: {}
            alt:
              label: "Carbon.Editor.Image:Main:map.alt"
              editor: "Neos.Neos/Inspector/Editors/TextFieldEditor"
              editorOptions: {}
```

These are global defaults. Set an option in a property's `editorOptions` to override the global value for that editor
instance.

Available options:

| Option             | Description                                                                                                                                                                    |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `imageProperty`    | Name of the image property used by the editor. Defaults to `image`. Use `parent:propertyName` to read the image from the parent node.                                          |
| `labelIfEmpty`     | Text or translation key displayed when no image is selected. Set it to `null` to hide the editor output in that case.                                                          |
| `saveAsJsonString` | When `true`, stores the value as a JSON string; the Neos property must then have `type: string`. When `false`, the value is stored as a native value, so use `type: array`.    |
| `openInDialog`     | FocalPoint editor only. When `true`, opens the focal point editor in a dialog like the Map editor. Changes are saved with Apply and discarded with Cancel. Defaults to `true`. |
| `areaProperties`   | Map editor only. Named fields for each area, with a `label`, Neos `editor` identifier and `editorOptions`. Set a field to `null` to omit it from the popup and saved data.     |

For example, to use a different image property only for one focal point field:

```yaml
editorOptions:
  imageProperty: "heroImage"
  labelIfEmpty: null
```

Property-level `editorOptions` take precedence over the corresponding global setting.

### Custom area fields

The Map editor creates its popup fields from `areaProperties`. By default, each area has `href`, `title` and `alt`
fields. Add custom fields or override individual field definitions in your property's `editorOptions`:

```yaml
editorOptions:
  areaProperties:
    alt: null
    description:
      label: "Description"
      editor: "Neos.Neos/Inspector/Editors/TextAreaEditor"
      editorOptions:
        placeholder: "Describe this area"
```

This keeps the global `href` and `title` fields, removes `alt`, and adds `description`. Each field definition replaces
the global definition with the same name. Labels support translation keys, and `editorOptions` are passed to the
selected Neos inspector editor. Fields are stored under their configured names alongside `shape` and `coords`; those two
names are reserved. Disabled and unconfigured fields are not saved when applying changes.

## Stored data format

### FocalPoint data

The focal point is stored as `x` and `y` coordinates, expressed as percentages of the image dimensions:

```json
{
  "x": 30,
  "y": 28
}
```

### Map data

The image map is stored as an array of areas. `shape` is either `rect` or `poly`, `coords` is an array of alternating
`x` and `y` floating-point percentages relative to the cropped output image (from `0` to `100`). The remaining fields
come from `areaProperties`, such as `href`, `title` and `alt`. X values are relative to the cropped width, Y values to
the cropped height, independently of the preview size.

```json
[
  {
    "shape": "rect",
    "coords": [12.5, 15.25, 68.75, 83.5],
    "href": "node://3211e0a0-4066-43f8-8f9c-6ff48a1017e4",
    "title": "Visit our website",
    "alt": "Website"
  },
  {
    "shape": "poly",
    "coords": [21.4, 11.6, 21.3, 25.9, 31.7, 30.2, 31.8, 15.5, 28.1, 14.9],
    "href": "node://e69d08dd-d0e8-464b-8552-bf4707d4f682",
    "title": "",
    "alt": ""
  }
]
```

These examples show the native values. When `saveAsJsonString` is `true`, the same data is stored as a JSON-encoded
string instead.
