import { api, ApiRequestError } from './api'

const OFFLINE = 'No se pudo conectar con el servidor local. ¿Está corriendo "pnpm dev"?'

function respondWith(response: Response | Error) {
  const fetchMock = vi.fn(async (_url: string, _init?: RequestInit) => {
    if (response instanceof Error) throw response
    return response
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

const json = (body: unknown, status: number) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

describe('api client against what the server really answers', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('returns the created row of a 201', async () => {
    const fetchMock = respondWith(json({ id: 7, name: 'Nequi' }, 201))
    await expect(api.accounts.create({ name: 'Nequi', type: 'billetera' })).resolves.toEqual({ id: 7, name: 'Nequi' })
    expect(fetchMock).toHaveBeenCalledWith('/api/accounts', expect.objectContaining({ method: 'POST', body: '{"name":"Nequi","type":"billetera"}' }))
  })

  it('resolves a 204 without trying to read a body', async () => {
    respondWith(new Response(null, { status: 204 }))
    await expect(api.transactions.remove(3)).resolves.toBeUndefined()
  })

  it('drops empty filters from the query string', async () => {
    const fetchMock = respondWith(json([], 200))
    await api.transactions.list({ month: '2026-10', q: '', categoryId: 4, accountId: undefined })
    expect(fetchMock.mock.calls[0]![0]).toBe('/api/transactions?month=2026-10&categoryId=4')
  })

  it('carries the message and the fields of a 422', async () => {
    respondWith(json({ error: 'Revisa los datos del formulario', fields: { categoryId: 'Elige una categoría de gastos' } }, 422))
    const error = await api.transactions.create({ date: '2026-10-02', amount: 500, type: 'expense', accountId: 1, categoryId: 9 }).catch((e: unknown) => e)
    expect(error).toBeInstanceOf(ApiRequestError)
    expect(error).toMatchObject({ status: 422, message: 'Revisa los datos del formulario', fields: { categoryId: 'Elige una categoría de gastos' } })
  })

  it('keeps the message of a 409', async () => {
    respondWith(json({ error: 'Esta cuenta tiene movimientos o gastos fijos asociados; archívala en su lugar.' }, 409))
    await expect(api.accounts.remove(1)).rejects.toMatchObject({ status: 409, message: 'Esta cuenta tiene movimientos o gastos fijos asociados; archívala en su lugar.', fields: {} })
  })

  it('says the API is down when fetch fails or the dev proxy answers a bare 500', async () => {
    respondWith(new TypeError('Failed to fetch'))
    await expect(api.accounts.list()).rejects.toMatchObject({ status: 0, message: OFFLINE })

    respondWith(new Response('', { status: 500 }))
    await expect(api.accounts.list()).rejects.toMatchObject({ status: 0, message: OFFLINE })
  })

  it('rejects a 200 whose body is not JSON instead of handing the views empty data', async () => {
    respondWith(new Response('<!doctype html><title>Finanzas</title>', { status: 200, headers: { 'Content-Type': 'text/html' } }))
    await expect(api.accounts.list()).rejects.toMatchObject({ status: 200, message: 'El servidor respondió algo que no se pudo leer. Intenta de nuevo.' })
  })

  it('keeps the status of a 4xx without a JSON body', async () => {
    respondWith(new Response('Not Found', { status: 404 }))
    await expect(api.accounts.list()).rejects.toMatchObject({ status: 404, message: 'Error 404' })
  })

  it('keeps the message of a real server 500', async () => {
    respondWith(json({ error: 'Error interno del servidor' }, 500))
    await expect(api.accounts.list()).rejects.toMatchObject({ status: 500, message: 'Error interno del servidor' })
  })
})
