# ips.js

Create and apply [IPS] patches, like the kind you'd use for a ROM hack.

## Installation

```bash
yarn global add ips.js
```

## Usage

### Command line

```bash
# Creating a patch
ips create clean.rom changed.rom patch.ips

# Applying a patch
ips apply clean.rom patch.ips changed.rom
```

### JavaScript

Note: All files are expected to be `Buffer` instances.

```js
import { createIpsPatch, applyIpsPatch } from 'ips.js';

// Creating a patch
const patchFile = createIpsPatch(sourceFile, targetFile);

// Applying a patch
const targetFile = applyIpsPatch(sourceFile, patchFile);
```

## Notes

When creating an IPS patch, this tool does a byte-by-byte comparison between the source and target files.
Only the bytes that have changed are included in the patch, which can result in slightly larger patches than other tools.

Those tools seem to save bytes in the patch by combining differences that are close together. Such patches
"fill in the gaps" between changes with extra unchanged data from the original file for a smaller filesize.
This isn't necessarily a good or a bad thing, just a different approach.

The side-effect would be that these smaller-size/larger-changeset patches might do surprising things when
multiple patches are applied to the same file. Does this matter? Probably not! Anyway, thanks for reading this.

## License

ISC © [Keith McKnight](https://keith.mcknig.ht)

[IPS]: http://fileformats.archiveteam.org/wiki/IPS_(binary_patch_format)
