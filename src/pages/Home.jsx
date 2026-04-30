import { useEffect, useState } from 'react'
import Header from '../components/Header.jsx'
import Button from '../components/Button.jsx'
import Card from '../components/Card.jsx'
import Stepper from '../components/Stepper.jsx'
import Field, { FieldRow } from '../components/Field.jsx'
import TextField from '../components/TextField.jsx'
import TextArea from '../components/TextArea.jsx'
import RadioGroup from '../components/RadioGroup.jsx'
import CheckboxGroup from '../components/CheckboxGroup.jsx'
import Combobox from '../components/Combobox.jsx'
import PhotoUploader from '../components/PhotoUploader.jsx'
import { ChevronLeft, ChevronRight } from '../components/Icon.jsx'
import {
  getClassificacoes,
  getFiliais,
  getAreas,
  getSetores,
  getItensObservados,
  createComunicado,
} from '../lib/api.js'
import './Home.css'

const STEPS = [
  'Classificação',
  'Identificação',
  'Responsável',
  'Observações',
  'Relato',
  'Fotos & envio',
]

const pad = (n) => String(n).padStart(2, '0')
const nowParts = () => {
  const d = new Date()
  return {
    date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
  }
}
const emptyForm = () => {
  const { date, time } = nowParts()
  return {
    classificacao: '',
    empresa: '',
    data: date, hora: time,
    area: '', setor: '', subsetor: '',
    atividade: '',
    intervencaoPor: '',
    matricula: '', funcao: '',
    observacoes: [], outros: '',
    descricao: '',
    acoes: '',
    altoRisco: '',
    comunicadoGestor: '',   // ✅ NOVO CAMPO
    fotos: [],
  }
}
export default function Home() {
  const [form, setForm] = useState(emptyForm)
  const [step, setStep] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [sent, setSent] = useState(false)
  const [sentCount, setSentCount] = useState(0)

  const set = (k) => (v) => setForm(f => ({ ...f, [k]: v }))
  const onInput = (k) => (e) => set(k)(e.target.value)

  // Carrega classificações da API (tabela dim_classificacao)
  const [classificacoes, setClassificacoes] = useState([])
  const [classifStatus, setClassifStatus] = useState('loading') // loading | ok | error
  const [classifError, setClassifError] = useState('')

  useEffect(() => {
    let cancelled = false
    setClassifStatus('loading')
    getClassificacoes(true)
      .then(rows => {
        if (cancelled) return
        setClassificacoes(rows.map(r => ({
          value: String(r.id),
          label: r.descricao,
        })))
        setClassifStatus('ok')
      })
      .catch(err => {
        if (cancelled) return
        setClassifError(err.message || 'Falha ao carregar')
        setClassifStatus('error')
      })
    return () => { cancelled = true }
  }, [])

  // Filiais (para o campo Empresa)
  const [filiais, setFiliais] = useState([])
  const [filiaisStatus, setFiliaisStatus] = useState('loading')
  const [filiaisError, setFiliaisError] = useState('')

  useEffect(() => {
    let cancelled = false
    setFiliaisStatus('loading')
    getFiliais(true)
      .then(rows => {
        if (cancelled) return
        setFiliais(rows.map(f => ({ value: String(f.id), label: f.descricao })))
        setFiliaisStatus('ok')
      })
      .catch(err => {
        if (cancelled) return
        setFiliaisError(err.message || 'Falha ao carregar')
        setFiliaisStatus('error')
      })
    return () => { cancelled = true }
  }, [])

  // Áreas da filial selecionada
  const [areas, setAreas] = useState([])
  const [areasStatus, setAreasStatus] = useState('idle') // idle | loading | ok | error

  useEffect(() => {
    if (!form.empresa) {
      setAreas([])
      setAreasStatus('idle')
      return
    }
    let cancelled = false
    setAreasStatus('loading')
    getAreas({ onlyActive: true, filialId: form.empresa })
      .then(rows => {
        if (cancelled) return
        setAreas(rows.map(a => ({ value: String(a.id), label: a.descricao })))
        setAreasStatus('ok')
      })
      .catch(() => {
        if (cancelled) return
        setAreasStatus('error')
      })
    return () => { cancelled = true }
  }, [form.empresa])

  // Setores da área selecionada
  const [setores, setSetores] = useState([])
  const [setoresStatus, setSetoresStatus] = useState('idle')

  useEffect(() => {
    if (!form.area) {
      setSetores([])
      setSetoresStatus('idle')
      return
    }
    let cancelled = false
    setSetoresStatus('loading')
    getSetores({ onlyActive: true, areaId: form.area })
      .then(rows => {
        if (cancelled) return
        setSetores(rows.map(s => ({ value: String(s.id), label: s.descricao })))
        setSetoresStatus('ok')
      })
      .catch(() => {
        if (cancelled) return
        setSetoresStatus('error')
      })
    return () => { cancelled = true }
  }, [form.area])

  // Itens observados (para o checklist da Etapa 4)
  const [itensObservados, setItensObservados] = useState([])
  const [itensStatus, setItensStatus] = useState('loading')
  const [itensError, setItensError] = useState('')
  const [outrosId, setOutrosId] = useState(null)

  useEffect(() => {
    let cancelled = false
    setItensStatus('loading')
    getItensObservados(true)
      .then(rows => {
        if (cancelled) return
        setItensObservados(rows)
        const outros = rows.find(r => r.descricao.trim().toLowerCase() === 'outros')
        setOutrosId(outros ? String(outros.id) : null)
        setItensStatus('ok')
      })
      .catch(err => {
        if (cancelled) return
        setItensError(err.message || 'Falha ao carregar')
        setItensStatus('error')
      })
    return () => { cancelled = true }
  }, [])

  // Opções do CheckboxGroup: "Outros" ganha o input inline condicional
  const itensObservadosOptions = itensObservados.map(r => {
    const base = { value: String(r.id), label: r.descricao }
    if (String(r.id) === outrosId) {
      return {
        ...base,
        extra: (
          <TextField
            value={form.outros}
            onChange={onInput('outros')}
            placeholder="Descreva outra condição observada"
            autoFocus
          />
        ),
      }
    }
    return base
  })

  // Quando o usuário troca filial, zera área e setor (evita seleção inconsistente)
  const onEmpresaChange = (v) => {
    setForm(f => ({ ...f, empresa: v, area: '', setor: '', subsetor: '' }))
  }
  const onAreaChange = (v) => {
    setForm(f => ({ ...f, area: v, setor: '', subsetor: '' }))
  }
  const onSetorChange = (v) => {
    setForm(f => ({ ...f, setor: v }))
  }

  const { date: todayStr, time: nowTimeStr } = nowParts()

  const onDataChange = (e) => {
    let value = e.target.value || todayStr
    if (value > todayStr) value = todayStr
    setForm(f => {
      const hora = value === todayStr && f.hora > nowTimeStr ? nowTimeStr : f.hora
      return { ...f, data: value, hora }
    })
  }
  const onHoraChange = (e) => {
    let value = e.target.value || nowTimeStr
    if (form.data === todayStr && value > nowTimeStr) value = nowTimeStr
    set('hora')(value)
  }

  const filled = (v) => typeof v === 'string' ? v.trim().length > 0 : !!v

  const canAdvance = () => {
    switch (step) {
      case 0:
        return filled(form.classificacao)
      case 1:
        return (
          filled(form.empresa) &&
          filled(form.data) &&
          filled(form.hora) &&
          filled(form.area) &&
          filled(form.setor) &&
          filled(form.atividade)
        )
      case 2:
        return (
          filled(form.intervencaoPor) &&
          filled(form.matricula) &&
          filled(form.funcao)
        )
      case 3: {
        if (form.observacoes.length === 0) return false
        if (outrosId && form.observacoes.includes(outrosId) && !filled(form.outros)) return false
        return true
      }
      case 4:
        return (
          filled(form.descricao) &&
          filled(form.acoes) &&
          filled(form.altoRisco)
        )
      case 5:
        return true
      default:
        return true
    }
  }

  const goBack = () => setStep(s => Math.max(0, s - 1))
  const goNext = () => setStep(s => Math.min(STEPS.length - 1, s + 1))

  const fileToBase64 = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = String(reader.result || '')
      const comma  = result.indexOf(',')
      resolve(comma >= 0 ? result.slice(comma + 1) : result)
    }
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })

  const submit = async (e) => {
    // Pode ser chamado pelo onClick do botão ou pelo onSubmit do form.
    // Em ambos os casos, impede qualquer comportamento default e revalida.
    if (e && typeof e.preventDefault === 'function') e.preventDefault()
    // Só envia quando o usuário está na última etapa (Fotos & envio).
    if (step !== STEPS.length - 1) return
    if (!canAdvance() || submitting) return

    setSubmitting(true)
    setSubmitError('')

    try {
      // Serializa as fotos (base64) — só roda nesta etapa, nunca antes
      const fotos = await Promise.all(
        form.fotos.map(async p => ({
          nome: p.name,
          mime: p.file.type || 'application/octet-stream',
          base64: await fileToBase64(p.file),
        }))
      )

      const isOutrosMarked = !!outrosId && form.observacoes.includes(outrosId)
      const payload = {
        classificacao_id:     Number(form.classificacao),
        filial_id:            Number(form.empresa),
        area_id:              Number(form.area),
        setor_id:             Number(form.setor),
        subsetor:             form.subsetor.trim() || null,
        data_comunicado:      form.data,
        hora_comunicado:      form.hora,
        atividade:            form.atividade.trim(),
        intervencao_por:      form.intervencaoPor.trim(),
        matricula:            form.matricula.trim(),
        funcao:               form.funcao.trim(),
        outros_descricao:     isOutrosMarked ? form.outros.trim() : null,
        descricao_observado:  form.descricao.trim(),
        acoes_imediatas:      form.acoes.trim(),
        alto_risco_potencial: form.altoRisco === 'sim',
        comunicado_gestor:    form.comunicadoGestor === 'sim', // ✅ NOVO
        itens_observados_ids: form.observacoes.map(Number),
        fotos,
      }

      await createComunicado(payload)

      const photoCount = form.fotos.length
      form.fotos.forEach(p => URL.revokeObjectURL(p.src))
      setSubmitting(false)
      setSentCount(photoCount)
      setSent(true)
      setTimeout(() => {
        setSent(false)
        setForm(emptyForm())
        setStep(0)
      }, 2800)
    } catch (err) {
      setSubmitting(false)
      setSubmitError(err.message || 'Falha ao enviar comunicado')
    }
  }

  const isLast = step === STEPS.length - 1

  return (
    <form className="screen" onSubmit={(e) => e.preventDefault()} noValidate>
      <div className="brand">
        <div className="brand__logo">CI</div>
        <div>
          <p className="brand__name">Cidade Imperial</p>
          <p className="brand__tag">Segurança do Trabalho · Interno</p>
        </div>
      </div>

      <Header
        title="Comunicado de Intervenção"
        subtitle="Condições e comportamentos inseguros"
      />

      <Stepper steps={STEPS} current={step} />

      <div className="wizard-step">
        {step === 0 && (
          <Card elevated padding="lg" className="stack stack-md">
            <Field label="Classificação" required>
              {classifStatus === 'loading' && (
                <p className="text-muted">Carregando classificações…</p>
              )}
              {classifStatus === 'error' && (
                <p className="text-muted" style={{ color: 'var(--color-accent-danger)' }}>
                  Não foi possível carregar: {classifError}
                </p>
              )}
              {classifStatus === 'ok' && (
                <RadioGroup
                  name="classificacao"
                  value={form.classificacao}
                  onChange={set('classificacao')}
                  direction="col"
                  options={classificacoes}
                />
              )}
            </Field>
          </Card>
        )}

        {step === 1 && (
          <Card padding="lg" className="stack stack-md">
            <Field label="Empresa" required>
              {filiaisStatus === 'loading' && (
                <p className="text-muted">Carregando filiais…</p>
              )}
              {filiaisStatus === 'error' && (
                <p className="text-muted" style={{ color: 'var(--color-accent-danger)' }}>
                  Não foi possível carregar: {filiaisError}
                </p>
              )}
              {filiaisStatus === 'ok' && (
                <RadioGroup
                  name="empresa"
                  value={form.empresa}
                  onChange={onEmpresaChange}
                  options={filiais}
                />
              )}
            </Field>
            <FieldRow>
              <Field label="Data" hint="Não pode ser futura" required>
                <TextField
                  type="date"
                  value={form.data}
                  max={todayStr}
                  onChange={onDataChange}
                />
              </Field>
              <Field label="Hora" hint="Não pode ser futura" required>
                <TextField
                  type="time"
                  value={form.hora}
                  max={form.data === todayStr ? nowTimeStr : undefined}
                  onChange={onHoraChange}
                />
              </Field>
            </FieldRow>
            <Field
              label="Área onde a intervenção foi realizada"
              required
              hint={!form.empresa ? 'Selecione a empresa primeiro' : undefined}
            >
              <Combobox
                value={form.area}
                onChange={onAreaChange}
                options={areas}
                placeholder={
                  !form.empresa            ? 'Selecione a empresa primeiro'
                  : areasStatus === 'loading' ? 'Carregando áreas…'
                  : areasStatus === 'error'   ? 'Erro ao carregar áreas'
                  :                             'Selecione a área'
                }
                searchPlaceholder="Buscar área…"
                emptyLabel={form.empresa ? 'Nenhuma área ativa nesta empresa' : 'Selecione a empresa'}
              />
            </Field>
            <Field
              label="Setor onde a intervenção foi realizada"
              required
              hint={!form.area ? 'Selecione a área primeiro' : undefined}
            >
              <Combobox
                value={form.setor}
                onChange={onSetorChange}
                options={setores}
                placeholder={
                  !form.area                  ? 'Selecione a área primeiro'
                  : setoresStatus === 'loading' ? 'Carregando setores…'
                  : setoresStatus === 'error'   ? 'Erro ao carregar setores'
                  :                               'Selecione o setor'
                }
                searchPlaceholder="Buscar setor…"
                emptyLabel={form.area ? 'Nenhum setor ativo nesta área' : 'Selecione a área'}
              />
            </Field>
            <Field label="Subsetor" hint="Opcional — detalhe específico dentro do setor">
              <TextField
                value={form.subsetor}
                onChange={onInput('subsetor')}
                placeholder="Ex.: Linha 02, Galpão A, Box 03"
                maxLength={120}
              />
            </Field>
            <Field label="Atividade realizada no momento da intervenção" required>
              <TextArea value={form.atividade} onChange={onInput('atividade')} placeholder="Descreva a atividade em andamento" />
            </Field>
          </Card>
        )}

        {step === 2 && (
          <Card padding="lg" className="stack stack-md">
            <Field label="Intervenção realizada por" required>
              <TextField value={form.intervencaoPor} onChange={onInput('intervencaoPor')} placeholder="Nome completo" />
            </Field>
            <FieldRow>
              <Field label="Matrícula" required>
                <TextField value={form.matricula} onChange={onInput('matricula')} placeholder="000000" inputMode="numeric" />
              </Field>
              <Field label="Função" required>
                <TextField value={form.funcao} onChange={onInput('funcao')} placeholder="Ex.: Técnico" />
              </Field>
            </FieldRow>
          </Card>
        )}

        {step === 3 && (
          <Field label="Itens observados" hint="Marque ao menos um item" required>
            {itensStatus === 'loading' && (
              <p className="text-muted">Carregando itens…</p>
            )}
            {itensStatus === 'error' && (
              <p className="text-muted" style={{ color: 'var(--color-accent-danger)' }}>
                Não foi possível carregar: {itensError}
              </p>
            )}
            {itensStatus === 'ok' && (
              <CheckboxGroup
                value={form.observacoes}
                onChange={set('observacoes')}
                options={itensObservadosOptions}
              />
            )}
          </Field>
        )}

        {step === 4 && (
  <div className="stack stack-md">
    <Card padding="lg" className="stack stack-md">
      <Field label="Breve descrição do que foi observado" required>
        <TextArea
          rows={5}
          value={form.descricao}
          onChange={onInput('descricao')}
          placeholder="O que aconteceu, quando e onde"
        />
      </Field>

      <Field label="O que fiz a respeito (ações imediatas)" required>
        <TextArea
          rows={5}
          value={form.acoes}
          onChange={onInput('acoes')}
          placeholder="Ação tomada no momento"
        />
      </Field>
    </Card>

    <Card elevated padding="lg" className="stack stack-md" style={{ marginBottom: '16px' }}>
      <Field label="A classificação deste reporte é de Alto Risco Potencial?" required>
        <RadioGroup
          name="altoRisco"
          value={form.altoRisco}
          onChange={set('altoRisco')}
          options={[
            { value: 'sim', label: 'Sim' },
            { value: 'nao', label: 'Não' },
          ]}
        />
      </Field>
</Card>
    <Card elevated padding="lg" className="stack stack-md">
      {/* ✅ NOVO CAMPO – AGORA NO LUGAR CERTO */}
      <Field label="Foi comunicado ao gestor da área?" required>
        <RadioGroup
          name="comunicadoGestor"
          value={form.comunicadoGestor}
          onChange={set('comunicadoGestor')}
          options={[
            { value: 'sim', label: 'Sim' },
            { value: 'nao', label: 'Não' },
          ]}
        />
      </Field>
    </Card>
  </div>
)}

        {step === 5 && (
          <div className="stack stack-md">
            <Field
              label="Fotos da intervenção"
              hint="Opcional — adicione até 10 fotos da galeria ou tire na hora"
            >
              <PhotoUploader
                value={form.fotos}
                onChange={set('fotos')}
                max={10}
              />
            </Field>
            <p className="disclaimer">
              Ao enviar, este comunicado será entregue à Segurança do Trabalho.
            </p>
          </div>
        )}
      </div>

      {!canAdvance() && (
        <p className="required-hint">
          Preencha todos os campos desta etapa para continuar.
        </p>
      )}

      {submitError && (
        <p className="required-hint" style={{ color: 'var(--color-accent-danger)' }}>
          {submitError}
        </p>
      )}

      <div className="wizard-actions">
        <Button
          type="button"
          variant="secondary"
          size="md"
          onClick={goBack}
          disabled={step === 0 || submitting}
          icon={<ChevronLeft width={18} height={18} />}
        >
          Voltar
        </Button>

        {isLast ? (
          <Button
            type="button"
            variant="primary"
            size="md"
            onClick={submit}
            disabled={!canAdvance() || submitting}
            icon={submitting ? <span className="spinner" aria-hidden="true" /> : null}
          >
            {submitting
              ? (form.fotos.length > 0
                  ? `Enviando ${form.fotos.length} ${form.fotos.length === 1 ? 'foto' : 'fotos'}…`
                  : 'Enviando…')
              : 'Enviar Comunicado'}
          </Button>
        ) : (
          <Button
            type="button"
            variant="primary"
            size="md"
            onClick={goNext}
            disabled={!canAdvance()}
            iconRight={<ChevronRight width={18} height={18} />}
          >
            Avançar
          </Button>
        )}
      </div>

      {sent && (
        <div className="toast" role="status">
          {sentCount > 0
            ? `Comunicado registrado com ${sentCount} ${sentCount === 1 ? 'foto' : 'fotos'}.`
            : 'Comunicado registrado. Obrigado pelo reporte.'}
        </div>
      )}
    </form>
  )
}
