export function Button({ children, className = "", onClick, type = "button", disabled }) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`px-3 py-2 rounded-2xl shadow transition ${disabled ? "opacity-70 cursor-not-allowed" : ""} ${className}`}
    >
      {children}
    </button>
  );
}
