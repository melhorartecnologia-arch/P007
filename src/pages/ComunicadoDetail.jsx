import { useEffect, useState } from 'react'
import Header from '../components/Header.jsx'
import Button from '../components/Button.jsx'
import Card from '../components/Card.jsx'
import Badge from '../components/Badge.jsx'
import ReactMarkdown from 'react-markdown'
import { ChevronLeft } from '../components/Icon.jsx'
import AuthedImage from '../components/AuthedImage.jsx'
import { navigate } from '../lib/router.js'
import { getComunicado, comunicadoFotoUrl, deleteComunicado } from '../lib/api.js'
import { getUser } from '../lib/auth.js'
import { hasPermission, PERMISSIONS } from '../lib/rbac.js'
import '../components/AuthedImage.css'
import '../pages/ClassificacoesCrud.css'
import './ComunicadoDetail.css'

function formatData(dateValue) {
  if (!dateValue) return ''
  const d = typeof dateValue === 'string' ? dateValue.slice(0, 10)
          : dateValue instanceof Date    ? dateValue.toISOString().slice(0, 10)
          : ''
  if (!d) return ''
  const [y, m, day] = d.split('-')
  return `${day}/${m}/${y}`
}
function formatHora(time) {
  if (!time) return ''
  return String(time).slice(0, 5)
}
function formatCriadoEm(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}
function formatBytes(n) {
  if (!n) return '0 B'
  const kb = n / 1024
  if (kb < 1024) return `${kb.toFixed(0)} KB`
  return `${(kb / 1024).toFixed(1)} MB`
}

function Kv({ label, children }) {
  return (
    <div className="kv">
      <span className="kv__label">{label}</span>
      <span className="kv__value">{children}</span>
    </div>
  )
}

export default function ComunicadoDetail({ id }) {
  const [data, setData] = useState(null)
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState('')
  const [viewingFoto, setViewingFoto] = useState(null)

  const me = getUser()
  const canDelete = hasPermission(me, PERMISSIONS.COMUNICADOS_DELETE)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  useEffect(() => {
    let cancelled = false
    setStatus('loading')
    getComunicado(id)
      .then(row => {
        if (cancelled) return
        setData(row)
        setStatus('ok')
      })
      .catch(err => {
        if (cancelled) return
        setError(err.message || 'Falha ao carregar')
        setStatus('error')
      })
    return () => { cancelled = true }
  }, [id])

  const back = () => navigate('comunicados')

  const remove = async () => {
    if (!canDelete || deleting) return
    setDeleting(true)
    setDeleteError('')
    try {
      await deleteComunicado(id)
      navigate('comunicados')
    } catch (err) {
      setDeleteError(err.message || 'Falha ao excluir comunicado')
      setConfirmDelete(false)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="screen screen--wide">
      <Header
        leading={
          <Button
            variant="ghost"
            size="sm"
            icon={<ChevronLeft width={18} height={18} />}
            onClick={back}
            aria-label="Voltar"
          />
        }
        title={`Comunicado #${id}`}
        subtitle={data ? formatCriadoEm(data.criado_em) : undefined}
      />

      {status === 'loading' && <p className="text-muted">Carregando…</p>}
      {status === 'error'   && <p className="crud-error">Erro: {error}</p>}

      {status === 'ok' && data && (
        <div className="detail-grid">
          <div className="detail-grid__main stack stack-md">
          <Card elevated padding="lg" className="stack stack-md">
            <div className="row row-between">
              <span className="text-section">Classificação</span>
              {data.alto_risco_potencial && <Badge variant="solid">Alto risco</Badge>}
            </div>
            <p className="detail-title">{data.classificacao_descricao}</p>
          </Card>
         <Card elevated padding="lg" className="stack stack-md">
          <div className="row row-between">
            <span className="text-section">Comunicação</span>

            {data.comunicado_gestor === false && (
              <Badge variant="warning">Não comunicado</Badge>
            )}

            {data.comunicado_gestor === true && (
              <Badge variant="success">Comunicado</Badge>
            )}
          </div>

          <p className="detail-title">
            Foi comunicado ao gestor da área:{' '}
            <strong>{data.comunicado_gestor ? 'Sim' : 'Não'}</strong>
          </p>
        </Card>

          <Card padding="lg" className="stack stack-sm">
            <span className="text-section">Identificação</span>
            <Kv label="Filial">
              {data.filial_descricao}
              {data.filial_abreviatura && (
                <span className="kv__extra"> · {data.filial_abreviatura} · Protheus {data.codigo_protheus}</span>
              )}
            </Kv>
            <Kv label="Área">{data.area_descricao}</Kv>
            <Kv label="Setor">{data.setor_descricao}</Kv>
            {data.subsetor && <Kv label="Subsetor">{data.subsetor}</Kv>}
            <Kv label="Data e hora">
              {formatData(data.data_comunicado)} às {formatHora(data.hora_comunicado)}
            </Kv>
            <Kv label="Atividade em andamento">{data.atividade}</Kv>
          </Card>

          <Card padding="lg" className="stack stack-sm">
            <span className="text-section">Responsável</span>
            <Kv label="Nome">{data.intervencao_por}</Kv>
            <Kv label="Matrícula">{data.matricula}</Kv>
            <Kv label="Função">{data.funcao}</Kv>
          </Card>

          <Card padding="lg" className="stack stack-sm">
            <span className="text-section">Itens observados</span>
            {data.itens_observados.length === 0 ? (
              <p className="text-muted" style={{ margin: 0 }}>Nenhum item marcado.</p>
            ) : (
              <ul className="detail-items">
                {data.itens_observados.map(io => (
                  <li key={io.id}>{io.descricao}</li>
                ))}
              </ul>
            )}
            {data.outros_descricao && (
              <Kv label="Outros">{data.outros_descricao}</Kv>
            )}
          </Card>

          <Card padding="lg" className="stack stack-sm">
            <span className="text-section">Relato</span>
            <Kv label="Descrição do que foi observado">{data.descricao_observado}</Kv>
            <Kv label="Ações imediatas">{data.acoes_imediatas}</Kv>
          </Card>
          </div>

          <div className="detail-grid__aside stack stack-md">
          <Card padding="lg" className="stack stack-md">
            <span className="text-section">
              Fotos {data.fotos.length > 0 ? `(${data.fotos.length})` : ''}
            </span>
            {data.fotos.length === 0 ? (
              <p className="text-muted" style={{ margin: 0 }}>Nenhuma foto anexada.</p>
            ) : (
              <ul className="detail-fotos">
                {data.fotos.map(f => (
                  <li key={f.id} className="detail-fotos__item">
                    <button
                      type="button"
                      className="detail-fotos__thumb"
                      onClick={() => setViewingFoto(f)}
                      aria-label={`Ver ${f.nome_original}`}
                    >
                      <AuthedImage
                        src={comunicadoFotoUrl(id, f.id)}
                        alt={f.nome_original}
                      />
                    </button>
                    <span className="detail-fotos__meta">{formatBytes(f.tamanho_bytes)}</span>
                    {f.analise_ia && (
                      <div className="detail-fotos__analise">
                        <span className="detail-fotos__analise-tag">Análise IA</span>
                        <div className="detail-fotos__analise-text markdown">
                          <ReactMarkdown>{f.analise_ia}</ReactMarkdown>
                        </div>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {canDelete && (
            <div className="crud-danger">
              {deleteError && <p className="crud-error">{deleteError}</p>}
              {!confirmDelete ? (
                <Button
                  variant="ghost"
                  size="md"
                  onClick={() => { setConfirmDelete(true); setDeleteError('') }}
                  disabled={deleting}
                  className="crud-danger__trigger"
                >
                  Excluir comunicado
                </Button>
              ) : (
                <Card padding="md" className="stack stack-sm">
                  <p className="text-body" style={{ margin: 0 }}>
                    Excluir este comunicado? Esta ação também apaga os itens
                    marcados e as fotos anexadas. Não pode ser desfeita.
                  </p>
                  <div className="crud-actions">
                    <Button variant="secondary" onClick={() => setConfirmDelete(false)} disabled={deleting}>
                      Cancelar
                    </Button>
                    <Button variant="primary" onClick={remove} disabled={deleting} className="btn--danger">
                      {deleting ? 'Excluindo…' : 'Sim, excluir'}
                    </Button>
                  </div>
                </Card>
              )}
            </div>
          )}
          </div>
        </div>
      )}

      {viewingFoto && (
        <div
          className="foto-modal"
          role="dialog"
          aria-modal="true"
          onClick={() => setViewingFoto(null)}
        >
          <AuthedImage
            src={comunicadoFotoUrl(id, viewingFoto.id)}
            alt={viewingFoto.nome_original}
            onClick={(e) => e.stopPropagation()}
          />
          <button
            type="button"
            className="foto-modal__close"
            onClick={() => setViewingFoto(null)}
          >
            Fechar
          </button>
        </div>
      )}
    </div>
  )
}
