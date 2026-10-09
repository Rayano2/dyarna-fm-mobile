type FileInput = {
  uri: string;
  name: string;
  type: string;
};

export function buildFormData(
  fields: Record<string, unknown>,
  files?: Record<string, FileInput | FileInput[]>,
): FormData {
  const form = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    if (value === undefined || value === null) continue;
    if (typeof value === 'object') {
      form.append(key, JSON.stringify(value));
    } else {
      form.append(key, String(value));
    }
  }
  if (files) {
    for (const [key, spec] of Object.entries(files)) {
      const arr = Array.isArray(spec) ? spec : [spec];
      for (const f of arr) {
        // React Native FormData accepts this shape for file uploads.
        // @ts-expect-error — RN form-data types differ from web.
        form.append(key, { uri: f.uri, name: f.name, type: f.type });
      }
    }
  }
  return form;
}
