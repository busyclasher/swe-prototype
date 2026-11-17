import Icon from './Icon.jsx';

/** The eight allocation-rule results (FR-19 to FR-26), pass or fail, each with its explanation (FR-27). */
export default function RuleChecklist({ checks }) {
  return (
    <ol className="rule-list">
      {checks.map((c) => (
        <li key={c.id} className={`rule ${c.passed ? 'rule-pass' : 'rule-fail'}`}>
          <Icon name={c.passed ? 'checkCircle' : 'xCircle'} size={18} />
          <div>
            <p className="rule-title">
              <span className="rule-fr tabular">{c.fr}</span> {c.label} — <strong>{c.passed ? 'Passed' : 'Failed'}</strong>
            </p>
            <p className="rule-msg">{c.message}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
