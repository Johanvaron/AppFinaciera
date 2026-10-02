/** Errors the HTTP layer knows how to turn into an ApiError response. */
export type AppErrorStatus = 404 | 409 | 422

export class AppError extends Error {
  readonly status: AppErrorStatus
  readonly fields?: Record<string, string>

  constructor(status: AppErrorStatus, message: string, fields?: Record<string, string>) {
    super(message)
    this.name = 'AppError'
    this.status = status
    if (fields) this.fields = fields
  }
}

export const notFound = (message: string): AppError => new AppError(404, message)
export const conflict = (message: string): AppError => new AppError(409, message)
export const invalid = (fields: Record<string, string>, message = 'Revisa los datos del formulario'): AppError =>
  new AppError(422, message, fields)
