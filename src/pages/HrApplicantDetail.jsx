import { useState } from 'react'
import { standingMessage } from '../utils/companyStanding'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, UserPlus } from '@phosphor-icons/react'
import { getApplicant, hireApplicant } from '../api/hr'
import { useResource } from '../hooks/useResource'
import { EQUIPMENT_TYPES } from '../data/equipmentTypes'
import { formatPlace, formatDate } from '../utils/format'
import { ApiError } from '../api/client'
import '../components/dashboard/Panel.css'
import './PageHeader.css'
import './HrApplicantDetail.css'

function daysUntil(dateStr) {
  if (!dateStr) return null
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000)
}

export default function HrApplicantDetail() {
  const { id } = useParams()
  const [hiring, setHiring] = useState(false)
  const [hireResult, setHireResult] = useState(null)
  const [hireError, setHireError] = useState(null)

  const { data: applicant, error, loading } = useResource(
    (signal) => getApplicant(id, signal),
    [id],
  )

  async function handleHire() {
    if (hiring) return
    setHiring(true)
    setHireError(null)

    try {
      const result = await hireApplicant(id)
      setHireResult(result)
    } catch (err) {
      if (err instanceof ApiError) {
        switch (err.code) {
          case 'APPLICANT_ALREADY_HIRED':
            setHireError('This applicant has already been hired by someone else.')
            break
          case 'APPLICANT_EXPIRED':
            setHireError('This applicant is no longer available — they took another position.')
            break
          case 'DRIVER_EMAIL_TAKEN':
            setHireError('A driver with this email already exists in the system.')
            break
          case 'FORBIDDEN':
            setHireError('You need the HR role to hire applicants.')
            break
          // Hiring costs money now (DOT physical, drug screen,
          // orientation). The server names the numbers, so its wording is
          // kept rather than replaced with something vaguer.
          case 'INSUFFICIENT_FUNDS':
            setHireError(err.message)
            break
          // A driver is a recurring wage, not a one-off fee. These two say
          // where the company stands rather than just declining.
          case 'CREDIT_LINE_EXHAUSTED':
          case 'COMPANY_INSOLVENT':
            setHireError(standingMessage(err) ?? err.message)
            break
          default:
            setHireError(err.message)
        }
      } else {
        setHireError('Something went wrong. Please try again.')
      }
    } finally {
      setHiring(false)
    }
  }

  if (loading) {
    return (
      <div className="page-head">
        <div className="page-empty">Loading applicant…</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="page-head">
        <div className="page-empty">Could not load applicant — {error.message}</div>
      </div>
    )
  }

  if (!applicant) return null

  const eq = EQUIPMENT_TYPES[applicant.desiredEquipment]
  const daysLeft = daysUntil(applicant.licenseExpiresOn)

  return (
    <>
      <div className="page-head">
        <div>
          <Link to="/hr" className="hr-back-link"><ArrowLeft size={14} /> Back to market</Link>
          <div className="page-title">{applicant.fullName}</div>
          <div className="page-sub">{applicant.email} · {applicant.phone}</div>
        </div>
      </div>

      {hireResult && (
        <div className="hr-hire-success">
          <span className="hr-hire-success-icon">✓</span>
          Hired as <strong>{hireResult.driver.id}</strong> — now visible in dispatch.
        </div>
      )}

      {hireError && (
        <div className="hr-hire-error">
          {hireError}
        </div>
      )}

      <div className="hr-detail-grid">
        <div className="panel hr-detail-section">
          <div className="hr-detail-section-title">CDL & License</div>
          <div className="hr-detail-row"><span className="hr-detail-label">Class</span><span className="hr-detail-value mono">CDL-{applicant.cdlClass}</span></div>
          <div className="hr-detail-row"><span className="hr-detail-label">State</span><span className="hr-detail-value mono">{applicant.cdlState}</span></div>
          <div className="hr-detail-row"><span className="hr-detail-label">License expires</span><span className="hr-detail-value mono">{formatDate(applicant.licenseExpiresOn)}{daysLeft != null && <span className="hr-days-until"> · {daysLeft}d</span>}</span></div>
          <div className="hr-detail-row"><span className="hr-detail-label">Experience</span><span className="hr-detail-value mono">{applicant.yearsExperience} years</span></div>
        </div>

        <div className="panel hr-detail-section">
          <div className="hr-detail-section-title">Home base</div>
          <div className="hr-detail-row"><span className="hr-detail-label">City</span><span className="hr-detail-value">{formatPlace(applicant.homeBaseCity, applicant.homeBaseState)}</span></div>
        </div>

        <div className="panel hr-detail-section">
          <div className="hr-detail-section-title">Equipment & Endorsements</div>
          <div className="hr-detail-row">
            <span className="hr-detail-label">Desired equipment</span>
            <span className="hr-detail-value">
              {eq ? (
                <span className="lb-equip-chip">
                  <eq.icon size={14} aria-hidden="true" />
                  {eq.label}
                </span>
              ) : applicant.desiredEquipment}
            </span>
          </div>
          <div className="hr-detail-row">
            <span className="hr-detail-label">Endorsements</span>
            <span className="hr-detail-value hr-endorsements">
              {(applicant.endorsements ?? []).length > 0
                ? applicant.endorsements.map((e) => (
                    <span key={e} className="hr-endorsement-tag">{e}</span>
                  ))
                : <span className="hr-no-endorsement">None</span>
              }
            </span>
          </div>
        </div>

        <div className="panel hr-detail-section">
          <div className="hr-detail-section-title">Safety record</div>
          <div className="hr-detail-row"><span className="hr-detail-label">MVR violations</span><span className="hr-detail-value mono">{applicant.mvrViolations}</span></div>
          <div className="hr-detail-row"><span className="hr-detail-label">Preventable accidents</span><span className="hr-detail-value mono">{applicant.preventableAccidents}</span></div>
          <div className="hr-detail-row"><span className="hr-detail-label">Employment gap</span><span className="hr-detail-value mono">{applicant.employmentGapMonths} months</span></div>
        </div>

        <div className="panel hr-detail-section">
          <div className="hr-detail-section-title">Compensation</div>
          <div className="hr-detail-row"><span className="hr-detail-label">Pay model</span><span className="hr-detail-value">{applicant.desiredPayModel === 'percent' ? 'Percent of load' : 'Per mile'}</span></div>
          {applicant.desiredPayModel === 'percent' && (
            <div className="hr-detail-row"><span className="hr-detail-label">Rate</span><span className="hr-detail-value mono">{applicant.desiredPayPercentBp ? `${(applicant.desiredPayPercentBp / 100).toFixed(1)}%` : '—'}</span></div>
          )}
          {applicant.desiredPayModel === 'permile' && (
            <div className="hr-detail-row"><span className="hr-detail-label">Rate</span><span className="hr-detail-value mono">{applicant.desiredPayPerMileCents ? `$${(applicant.desiredPayPerMileCents / 100).toFixed(2)}/mi` : '—'}</span></div>
          )}
        </div>
      </div>

      <div className="hr-hire-actions">
        <button
          type="button"
          className="hr-hire-btn"
          disabled={hiring || !!hireResult}
          onClick={handleHire}
        >
          <UserPlus size={16} />
          {hiring ? 'Hiring…' : hireResult ? 'Hired' : 'Hire applicant'}
        </button>
      </div>
    </>
  )
}
