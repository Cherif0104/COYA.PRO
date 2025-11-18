import React, { useMemo } from 'react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Invoice, Expense, Budget, CurrencyCode, Language } from '../types';
import { useLocalization } from '../contexts/LocalizationContext';
import { CurrencyService } from '../services/currencyService';

interface FinanceAnalyticsProps {
    invoices: Invoice[];
    expenses: Expense[];
    budgets: Budget[];
}

const COLORS = ['#10b981', '#ef4444', '#f59e0b', '#3b82f6', '#8b5cf6', '#ec4899'];

export const FinanceAnalytics: React.FC<FinanceAnalyticsProps> = ({ invoices, expenses, budgets }) => {
    const { t, language } = useLocalization();
    const getLocale = language === Language.FR ? 'fr-FR' : 'en-US';

    // Formatage de devise
    const formatCurrency = (value: number, currencyCode?: CurrencyCode) => {
        const code = currencyCode || 'USD';
        return CurrencyService.formatCurrency(value, code, getLocale);
    };

    // Fonction d'export CSV
    const exportToCSV = (data: any[], filename: string, headers: string[]) => {
        const csvContent = [
            headers.join(','),
            ...data.map(row => Object.values(row).map(val => {
                // Échapper les virgules et guillemets dans les valeurs
                const str = String(val || '');
                if (str.includes(',') || str.includes('"') || str.includes('\n')) {
                    return `"${str.replace(/"/g, '""')}"`;
                }
                return str;
            }).join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleExportInvoices = () => {
        const data = invoices.map(inv => ({
            'Numéro': inv.invoiceNumber,
            'Client': inv.clientName,
            'Montant': inv.amount,
            'Devise': inv.currencyCode || 'USD',
            'Taux de change': inv.exchangeRate || 1,
            'Montant USD': inv.baseAmountUSD || (inv.amount * (inv.exchangeRate || 1)),
            'Date échéance': inv.dueDate,
            'Date transaction': inv.transactionDate || inv.dueDate,
            'Statut': inv.status,
            'Montant payé': inv.paidAmount || '',
            'Date paiement': inv.paidDate || ''
        }));
        exportToCSV(data, `factures_${new Date().toISOString().split('T')[0]}.csv`, Object.keys(data[0] || {}));
    };

    const handleExportExpenses = () => {
        const data = expenses.map(exp => ({
            'Description': exp.description,
            'Catégorie': exp.category || '',
            'Montant': exp.amount,
            'Devise': exp.currencyCode || 'USD',
            'Taux de change': exp.exchangeRate || 1,
            'Montant USD': exp.baseAmountUSD || (exp.amount * (exp.exchangeRate || 1)),
            'Date': exp.date,
            'Date transaction': exp.transactionDate || exp.date,
            'Statut': exp.status,
            'Date échéance': exp.dueDate || ''
        }));
        exportToCSV(data, `depenses_${new Date().toISOString().split('T')[0]}.csv`, Object.keys(data[0] || {}));
    };

    const handleExportAll = () => {
        const allData = [
            ...invoices.map(inv => ({
                'Type': 'Facture',
                'Référence': inv.invoiceNumber,
                'Description': inv.clientName,
                'Montant': inv.amount,
                'Devise': inv.currencyCode || 'USD',
                'Taux de change': inv.exchangeRate || 1,
                'Montant USD': inv.baseAmountUSD || (inv.amount * (inv.exchangeRate || 1)),
                'Date': inv.transactionDate || inv.dueDate,
                'Statut': inv.status
            })),
            ...expenses.map(exp => ({
                'Type': 'Dépense',
                'Référence': exp.id,
                'Description': exp.description,
                'Montant': exp.amount,
                'Devise': exp.currencyCode || 'USD',
                'Taux de change': exp.exchangeRate || 1,
                'Montant USD': exp.baseAmountUSD || (exp.amount * (exp.exchangeRate || 1)),
                'Date': exp.transactionDate || exp.date,
                'Statut': exp.status
            }))
        ];
        exportToCSV(allData, `transactions_${new Date().toISOString().split('T')[0]}.csv`, Object.keys(allData[0] || {}));
    };

    // Données pour graphique revenus vs dépenses par mois (12 derniers mois)
    const monthlyData = useMemo(() => {
        const now = new Date();
        const months: { [key: string]: { month: string; revenue: number; expenses: number; net: number } } = {};

        // Initialiser les 12 derniers mois
        for (let i = 11; i >= 0; i--) {
            const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            const monthLabel = date.toLocaleDateString(getLocale, { month: 'short', year: 'numeric' });
            months[monthKey] = { month: monthLabel, revenue: 0, expenses: 0, net: 0 };
        }

        // Calculer les revenus par mois
        invoices.forEach(inv => {
            if (inv.status === 'Paid' || inv.status === 'Partially Paid') {
                const date = new Date(inv.transactionDate || inv.dueDate);
                const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                if (months[monthKey]) {
                    const amount = inv.status === 'Paid' ? inv.amount : (inv.paidAmount || 0);
                    // Convertir en USD si nécessaire
                    const amountUSD = inv.currencyCode === 'USD' ? amount : (amount * (inv.exchangeRate || 1));
                    months[monthKey].revenue += amountUSD;
                }
            }
        });

        // Calculer les dépenses par mois
        expenses.forEach(exp => {
            const date = new Date(exp.transactionDate || exp.date);
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            if (months[monthKey]) {
                const amountUSD = exp.currencyCode === 'USD' ? exp.amount : (exp.amount * (exp.exchangeRate || 1));
                months[monthKey].expenses += amountUSD;
            }
        });

        // Calculer le net
        Object.keys(months).forEach(key => {
            months[key].net = months[key].revenue - months[key].expenses;
        });

        return Object.values(months);
    }, [invoices, expenses, getLocale]);

    // Données pour répartition des dépenses par catégorie
    const expenseByCategory = useMemo(() => {
        const categories: { [key: string]: number } = {};
        
        expenses.forEach(exp => {
            const category = exp.category || 'Other';
            const amountUSD = exp.currencyCode === 'USD' ? exp.amount : (exp.amount * (exp.exchangeRate || 1));
            categories[category] = (categories[category] || 0) + amountUSD;
        });

        return Object.entries(categories)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 6); // Top 6 catégories
    }, [expenses]);

    // Métriques avancées
    const advancedMetrics = useMemo(() => {
        const paidInvoices = invoices.filter(inv => inv.status === 'Paid');
        const sentInvoices = invoices.filter(inv => inv.status === 'Sent' || inv.status === 'Overdue');
        const totalInvoices = invoices.filter(inv => inv.status !== 'Draft').length;
        
        // Taux de conversion
        const conversionRate = totalInvoices > 0 ? (paidInvoices.length / totalInvoices) * 100 : 0;

        // Délai moyen de paiement
        let avgPaymentDays = 0;
        if (paidInvoices.length > 0) {
            const totalDays = paidInvoices
                .filter(inv => inv.paidDate && inv.dueDate)
                .reduce((sum, inv) => {
                    const dueDate = new Date(inv.dueDate);
                    const paidDate = new Date(inv.paidDate!);
                    const diffTime = paidDate.getTime() - dueDate.getTime();
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                    return sum + diffDays;
                }, 0);
            avgPaymentDays = Math.round(totalDays / paidInvoices.filter(inv => inv.paidDate).length);
        }

        // Total revenus
        const totalRevenue = paidInvoices.reduce((sum, inv) => {
            const amountUSD = inv.currencyCode === 'USD' ? inv.amount : (inv.amount * (inv.exchangeRate || 1));
            return sum + amountUSD;
        }, 0) + invoices
            .filter(inv => inv.status === 'Partially Paid')
            .reduce((sum, inv) => {
                const amountUSD = inv.currencyCode === 'USD' ? (inv.paidAmount || 0) : ((inv.paidAmount || 0) * (inv.exchangeRate || 1));
                return sum + amountUSD;
            }, 0);

        // Total dépenses
        const totalExpenses = expenses.reduce((sum, exp) => {
            const amountUSD = exp.currencyCode === 'USD' ? exp.amount : (exp.amount * (exp.exchangeRate || 1));
            return sum + amountUSD;
        }, 0);

        // Revenu net
        const netIncome = totalRevenue - totalExpenses;

        // Factures en retard
        const overdueInvoices = invoices.filter(inv => {
            if (inv.status === 'Paid' || inv.status === 'Draft') return false;
            const dueDate = new Date(inv.dueDate);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            return dueDate < today;
        });

        // Budgets dépassés
        const overBudget = budgets.filter(budget => {
            const allItemIds = new Set(budget.budgetLines.flatMap(l => l.items.map(i => i.id)));
            const spent = expenses
                .filter(exp => exp.budgetItemId && allItemIds.has(exp.budgetItemId))
                .reduce((sum, exp) => {
                    const amountUSD = exp.currencyCode === 'USD' ? exp.amount : (exp.amount * (exp.exchangeRate || 1));
                    return sum + amountUSD;
                }, 0);
            const budgetUSD = budget.currencyCode === 'USD' ? budget.amount : (budget.amount * (budget.exchangeRate || 1));
            return spent > budgetUSD;
        });

        return {
            conversionRate: conversionRate.toFixed(1),
            avgPaymentDays,
            totalRevenue,
            totalExpenses,
            netIncome,
            overdueCount: overdueInvoices.length,
            overdueAmount: overdueInvoices.reduce((sum, inv) => {
                const remaining = inv.status === 'Partially Paid' 
                    ? (inv.amount - (inv.paidAmount || 0))
                    : inv.amount;
                const amountUSD = inv.currencyCode === 'USD' ? remaining : (remaining * (inv.exchangeRate || 1));
                return sum + amountUSD;
            }, 0),
            overBudgetCount: overBudget.length
        };
    }, [invoices, expenses, budgets]);

    return (
        <div className="space-y-6">
            {/* Boutons d'export */}
            <div className="bg-white rounded-lg shadow-lg p-4 border border-gray-200">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-gray-900">{t('export_data') || 'Exporter les données'}</h3>
                    <div className="flex gap-3">
                        <button
                            onClick={handleExportInvoices}
                            className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors flex items-center gap-2"
                        >
                            <i className="fas fa-file-csv"></i>
                            {t('export_invoices') || 'Exporter Factures'}
                        </button>
                        <button
                            onClick={handleExportExpenses}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                        >
                            <i className="fas fa-file-csv"></i>
                            {t('export_expenses') || 'Exporter Dépenses'}
                        </button>
                        <button
                            onClick={handleExportAll}
                            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
                        >
                            <i className="fas fa-file-csv"></i>
                            {t('export_all') || 'Exporter Tout'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Métriques avancées */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-600">{t('conversion_rate') || 'Taux de conversion'}</span>
                        <i className="fas fa-percentage text-2xl text-blue-500"></i>
                    </div>
                    <p className="text-3xl font-bold text-gray-900">{advancedMetrics.conversionRate}%</p>
                    <p className="text-xs text-gray-500 mt-1">{t('paid_invoices') || 'Factures payées'}</p>
                </div>

                <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-600">{t('avg_payment_days') || 'Délai paiement moyen'}</span>
                        <i className="fas fa-clock text-2xl text-orange-500"></i>
                    </div>
                    <p className="text-3xl font-bold text-gray-900">{advancedMetrics.avgPaymentDays}</p>
                    <p className="text-xs text-gray-500 mt-1">{t('days') || 'jours'}</p>
                </div>

                <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-600">{t('overdue_invoices') || 'Factures en retard'}</span>
                        <i className="fas fa-exclamation-triangle text-2xl text-red-500"></i>
                    </div>
                    <p className="text-3xl font-bold text-gray-900">{advancedMetrics.overdueCount}</p>
                    <p className="text-xs text-gray-500 mt-1">{formatCurrency(advancedMetrics.overdueAmount)}</p>
                </div>

                <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-600">{t('budgets_exceeded') || 'Budgets dépassés'}</span>
                        <i className="fas fa-chart-line text-2xl text-purple-500"></i>
                    </div>
                    <p className="text-3xl font-bold text-gray-900">{advancedMetrics.overBudgetCount}</p>
                    <p className="text-xs text-gray-500 mt-1">{t('budgets') || 'Budgets'}</p>
                </div>
            </div>

            {/* Graphique revenus vs dépenses */}
            <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200">
                <h3 className="text-lg font-bold text-gray-900 mb-4">{t('revenue_vs_expenses') || 'Revenus vs Dépenses (12 derniers mois)'}</h3>
                <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={monthlyData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis />
                        <Tooltip 
                            formatter={(value: number) => formatCurrency(value)}
                            labelStyle={{ color: '#374151' }}
                        />
                        <Legend />
                        <Line type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2} name={t('revenue') || 'Revenus'} />
                        <Line type="monotone" dataKey="expenses" stroke="#ef4444" strokeWidth={2} name={t('expenses') || 'Dépenses'} />
                        <Line type="monotone" dataKey="net" stroke="#3b82f6" strokeWidth={2} name={t('net_income') || 'Revenu net'} />
                    </LineChart>
                </ResponsiveContainer>
            </div>

            {/* Graphique évolution revenu net */}
            <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200">
                <h3 className="text-lg font-bold text-gray-900 mb-4">{t('net_income_evolution') || 'Évolution du Revenu Net'}</h3>
                <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={monthlyData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis />
                        <Tooltip 
                            formatter={(value: number) => formatCurrency(value)}
                            labelStyle={{ color: '#374151' }}
                        />
                        <Legend />
                        <Bar dataKey="net" fill="#3b82f6" name={t('net_income') || 'Revenu net'} />
                    </BarChart>
                </ResponsiveContainer>
            </div>

            {/* Répartition des dépenses par catégorie */}
            <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200">
                <h3 className="text-lg font-bold text-gray-900 mb-4">{t('expenses_by_category') || 'Répartition des Dépenses par Catégorie'}</h3>
                <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                        <Pie
                            data={expenseByCategory}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                        >
                            {expenseByCategory.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    </PieChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

