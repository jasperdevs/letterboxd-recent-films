import { existsSync, readFileSync, statSync } from 'node:fs';

const required = ['main.js', 'manifest.json', 'styles.css'];
for (const file of required) {
	if (!existsSync(file) || statSync(file).size === 0) {
		throw new Error(`Missing or empty release artifact: ${file}`);
	}
}

const manifest = JSON.parse(readFileSync('manifest.json', 'utf8'));
const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));
const versions = JSON.parse(readFileSync('versions.json', 'utf8'));

if (manifest.version !== packageJson.version) {
	throw new Error('manifest.json and package.json versions do not match.');
}
if (versions[manifest.version] !== manifest.minAppVersion) {
	throw new Error('versions.json does not map the current version to minAppVersion.');
}
if (process.env.GITHUB_REF_TYPE === 'tag' && process.env.GITHUB_REF_NAME !== manifest.version) {
	throw new Error('The release tag must exactly match the manifest version.');
}

console.log(`Verified release artifacts for ${manifest.id} ${manifest.version}.`);
