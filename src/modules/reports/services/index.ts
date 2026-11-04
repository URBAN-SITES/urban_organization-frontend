import axios from 'axios'
import { api } from '@/app/plugins/axios'
import type { Report, ReportDays } from '../types'

export async function getReport(organizationId: string, days: ReportDays): Promise<Report> {
  const path = `/organizations/${encodeURIComponent(organizationId)}/reports/`
  return (await api.get<Report>(path, { params: { days } })).data
}

/** Relatório em PDF montado no servidor; erros JSON que chegam como blob viram objeto. */
export async function downloadReportPdf(organizationId: string, days: ReportDays): Promise<Blob> {
  const path = `/organizations/${encodeURIComponent(organizationId)}/reports/pdf/`
  try {
    return (await api.get<Blob>(path, { params: { days }, responseType: 'blob', timeout: 60_000 }))
      .data
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.data instanceof Blob) {
      try {
        error.response.data = JSON.parse(await error.response.data.text()) as unknown
      } catch {
        // corpo que não é JSON: fica a mensagem padrão de quem chamou
      }
    }
    throw error
  }
}
