export function Button({ children, className, onClick }) {
  return (
    <button onClick={onClick} className={`px-3 py-2 rounded ${className}`}>
      {children}
    </button>
  );
}