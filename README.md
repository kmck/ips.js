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

## License

ISC © [Keith McKnight](https://keith.mcknig.ht)

[IPS]: http://fileformats.archiveteam.org/wiki/IPS_(binary_patch_format)
