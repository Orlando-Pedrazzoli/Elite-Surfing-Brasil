import mongoose from 'mongoose';

const addressSchema = new mongoose.Schema({
  // ✅ userId opcional para suportar guest checkout
  userId: { type: String, required: false, default: null },
  
  // 🆕 Flag para identificar endereços de guest
  isGuestAddress: { type: Boolean, default: false },
  
  // Dados pessoais
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String, required: true },
  cpf: { type: String, required: false, default: '' },
  
  // Endereço brasileiro
  street: { type: String, required: true },
  number: { type: String, required: false, default: '' },
  complement: { type: String, required: false, default: '' },
  neighborhood: { type: String, required: false, default: '' },
  city: { type: String, required: true },
  state: { type: String, required: true },
  zipcode: { type: String, required: true }, // CEP: 00000-000
  country: { type: String, required: true, default: 'Brasil' },
});

// Index para performance
addressSchema.index({ userId: 1 });

const Address =
  mongoose.models.address || mongoose.model('address', addressSchema);

export default Address;