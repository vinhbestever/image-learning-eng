import '@testing-library/jest-dom'

URL.createObjectURL = () => 'blob:mock-url'
URL.revokeObjectURL = () => {}
