# Upload

When scaling up a web application, this is a likely candidate for the first thing to be offloaded externally. Because of that, we maintain an API similar to S3. Specifically, uploading and downloading files requires a signature so that authentication happens outside of the actual file server.

## UploadServer

```ts
import { UploadServer } from "upload/UploadServer"

// The upload key is just a string used for creating secure signatures. Create your own with:
// > node -e 'console.log(require("crypto").randomBytes(128).toString("base64"))'
const config = {
  uploadKey: Buffer.from(process.env.UPLOAD_KEY),
  baseUrl: "https://your-app.com"
}

await UploadServer({ config }, app)
```

## Uploading Files

You need to integrate `getDownloadUrls` and `getUploadUrls` into your API.

```ts
import { useFileUpload, uploadFile } from "ui/components/FileUpload"

const { uploads, handleDrop } = useFileUpload(async (uploads) => {

	// Get signed upload URLs from your API
  const response = await api.getUploadUrls({
    files: uploads.map((upload) => ({
      id: upload.id,
      filename: upload.file.name
    })),
  })

  if (response.status !== 200) {
    for (const upload of uploads)
      upload.setState({ error: "Failed to get upload URL" })
    return
  }

  // Upload each file to its signed URL
  await Promise.all(
    uploads.map(async (upload) => {
      const uploadUrl = response.body.urls[upload.id]
      await uploadFile(upload.file, uploadUrl, (progress) =>
        upload.setState({ progress })
      )
      upload.setState({ uploaded: true })
    })
  )
})
```

Use `FileUploadDropZone` and `UploadPreview` components to display the UI:

```ts
<FileUploadDropZone onDrop={handleDrop}>
  {uploads.map((upload) => (
    <UploadPreview key={upload.id} {...upload} />
  ))}
</FileUploadDropZone>
```

## Downloading Files

```ts
const response = await api.getDownloadUrls({ fileIds: ["file-id"] })
const downloadUrl = response.body.urls["file-id"]
// Use the signed URL to fetch the file
```
