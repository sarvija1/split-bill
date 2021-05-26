import R from "ramda";
import { payments } from "./data.js"

const amountsToNumbers = R.map(({ name, amount }) => ({ name, amount: amount || 0 }))

const toSinglePaymentEntryPerPerson = R.reduce((accumulator, { name, amount }) => {
  const existingPayment = accumulator.find(payment => payment.name === name)
  return existingPayment
    ? [...accumulator.filter(payment => payment !== existingPayment), { name, amount: existingPayment.amount + amount }]
    : [...accumulator, { name, amount }]
}, [])

const combinePayments = R.pipe(amountsToNumbers, toSinglePaymentEntryPerPerson)

const sumAmounts = R.pipe(R.map(({ amount }) => amount), R.sum)

const partitionToGiversAndReceivers = cutoff => R.reduce(({ givers, receivers }, {name, amount}) => {
  if (amount > cutoff) {
    return {
      givers,
      receivers: [...receivers, { name, amount: amount - cutoff }]
    }
  } else if (amount < cutoff) {
    return {
      givers:[...givers, { name, amount: amount - cutoff }],
      receivers
    }
  } else {
    return { givers, receivers }
  }
}, { givers: [], receivers: [] })

const orderByAbsoluteAmounts = R.sort(({ amount: a1 }, { amount: a2 }) =>  Math.abs(a2) - Math.abs(a1))

const updatePaymentList = (oldPayment, newPayment, payments) => newPayment.amount === 0 ?
  [...payments.filter(payment => payment !== oldPayment)] :
  [...payments.filter(payment => payment !== oldPayment), newPayment]

const settlePayments = (givers, receivers, transactions = []) => {
  if (givers.length === 0 || receivers.length === 0) return transactions
  const currentGiver = R.head(orderByAbsoluteAmounts(givers))
  const currentReceiver = R.head(orderByAbsoluteAmounts(receivers))
  const transactionAmount = Math.min(-currentGiver.amount, currentReceiver.amount)

  const newGiver = { name: currentGiver.name, amount: currentGiver.amount + transactionAmount }
  const newGivers = updatePaymentList(currentGiver, newGiver, givers)

  const newReceiver = { name: currentReceiver.name, amount: currentReceiver.amount - transactionAmount }
  const newReceivers = updatePaymentList(currentReceiver, newReceiver, receivers)

  const newTransaction = { from: currentGiver.name, to: currentReceiver.name, amount: transactionAmount }

  return settlePayments(newGivers, newReceivers, [...transactions, newTransaction])
}

const formatDecimals = digits => ({ from, to, amount}) => ({ from, to, amount: amount.toFixed(digits) })

// TL;DR section starts here

const paymentsPerPerson = combinePayments(payments)
const amountPerPerson = sumAmounts(paymentsPerPerson) / paymentsPerPerson.length
const { givers, receivers } = partitionToGiversAndReceivers(amountPerPerson)(paymentsPerPerson)
const transactions = settlePayments(givers, receivers).map(formatDecimals(2))

console.log(transactions)
