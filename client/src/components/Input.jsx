import './Input.css';

export default function Input({
  label,
  id,
  name,
  type = 'text',
  value,
  onChange,
  placeholder,
  error,
  required = false,
  disabled = false,
}) {
  return (
    <div className="input-field">
      {label && (
        <label htmlFor={id} className="input-label">
          {label}
          {required && <span className="input-required"> *</span>}
        </label>
      )}
      <input
        id={id}
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        className={`input-control${error ? ' input-control--error' : ''}`}
      />
      {error && <p className="input-error">{error}</p>}
    </div>
  );
}
