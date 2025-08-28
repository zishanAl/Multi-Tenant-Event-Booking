import type { PayloadRequest } from 'payload'
import type { CustomUser } from '../types/custom'

type CustomReq = PayloadRequest & { user?: CustomUser }

export const getTenantId = (req: CustomReq): string | undefined => {
  const t = req?.user?.tenant
  if (!t) return undefined
  if (typeof t === 'string') return t
  if (typeof t === 'object') {
    const obj = t as any
    return obj.id || obj._id || obj.value || undefined
  }
  return undefined
}

export const sameTenantWhere = (req: CustomReq): Record<string, any> => {
  const id = getTenantId(req)
  return id ? { tenant: { equals: id } } : { id: { equals: '' } }
}

export const ownsRecord = (req: CustomReq): Record<string, any> => {
  const id = getTenantId(req)
  return req?.user?.id && id
    ? { user: { equals: req.user.id }, tenant: { equals: id } }
    : { id: { equals: '' } }
}

export const setTenantField = (
  data: Record<string, any>,
  req: CustomReq
): Record<string, any> => {
  const id = getTenantId(req) || data?.tenant
  if (typeof id === 'object') {
    const obj = id as any
    return { ...data, tenant: obj.id || obj._id || obj.value }
  }
  return { ...data, tenant: id }
}
