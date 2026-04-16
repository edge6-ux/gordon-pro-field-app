import { put } from '@vercel/blob'
import { v4 as uuidv4 } from 'uuid'

export async function uploadPhoto(file: File, submissionId: string): Promise<string> {
  const ext = file.name.split('.').pop() ?? 'jpg'
  const filename = `submissions/${submissionId}/${uuidv4()}.${ext}`

  const blob = await put(filename, file, {
    access: 'public',
    contentType: file.type,
  })

  return blob.url
}

export async function uploadPhotos(files: File[], submissionId: string): Promise<string[]> {
  const uploads = files.map((file) => uploadPhoto(file, submissionId))
  return Promise.all(uploads)
}
