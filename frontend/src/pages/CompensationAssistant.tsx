import React, { useState } from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Divider from '@mui/material/Divider';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import AutoAwesomeOutlinedIcon from '@mui/icons-material/AutoAwesomeOutlined';
import SendOutlinedIcon from '@mui/icons-material/SendOutlined';
import CheckCircleOutlineOutlinedIcon from '@mui/icons-material/CheckCircleOutlineOutlined';
import HelpOutlineOutlinedIcon from '@mui/icons-material/HelpOutlineOutlined';

import { apiService } from '../services/api.service';
import type { AssistantResponse } from '../types/assistant';

const QUICK_PROMPTS = [
  'How many employees are there?',
  'How many employees are in India?',
  'How many employees are in Engineering in India?',
  'What is the average salary?',
  'What is the median salary in Engineering?',
  'Which department has the highest average salary?',
  'Which country has the lowest average salary?',
  'Compare Engineering and Finance',
  'Show salary by department',
  'Show salary by country',
  'How many employees earn between 50,000 and 100,000?',
];

const CURRENCIES = ['USD', 'EUR', 'GBP', 'INR', 'CAD', 'AUD'];

export const CompensationAssistant: React.FC = () => {
  const [question, setQuestion] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AssistantResponse | null>(null);

  const handleAsk = async (queryText?: string) => {
    const q = (queryText !== undefined ? queryText : question).trim();
    if (!q) return;

    if (queryText !== undefined) {
      setQuestion(queryText);
    }

    setLoading(true);
    setError(null);

    try {
      const response = await apiService.assistant.ask(q, currency);
      setResult(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while answering your question');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAsk();
    }
  };

  const renderVisualizer = () => {
    if (!result) return null;
    const { operation, data } = result;

    if (operation === 'compare_departments') {
      const deptA = data.department_a as { department: string; headcount: number; average_salary: number } | undefined;
      const deptB = data.department_b as { department: string; headcount: number; average_salary: number } | undefined;
      if (!deptA || !deptB) return null;

      return (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2, mt: 2 }}>
          {[deptA, deptB].map((dept, idx) => (
            <Card key={idx} variant="outlined" sx={{ borderRadius: 2, bgcolor: '#f8fafc' }}>
              <CardContent sx={{ p: 2 }}>
                <Typography variant="subtitle2" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                  Department
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 1.5 }}>
                  {dept.department}
                </Typography>
                <Divider sx={{ mb: 1.5 }} />
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2" color="text.secondary">Headcount:</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>{dept.headcount.toLocaleString()}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">Avg Salary:</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600, color: 'primary.main' }}>
                    {dept.average_salary.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {String(data.currency || 'USD')}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          ))}
        </Box>
      );
    }

    if (operation === 'compare_countries') {
      const cA = data.country_a as { country: string; headcount: number; average_salary: number } | undefined;
      const cB = data.country_b as { country: string; headcount: number; average_salary: number } | undefined;
      if (!cA || !cB) return null;

      return (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2, mt: 2 }}>
          {[cA, cB].map((country, idx) => (
            <Card key={idx} variant="outlined" sx={{ borderRadius: 2, bgcolor: '#f8fafc' }}>
              <CardContent sx={{ p: 2 }}>
                <Typography variant="subtitle2" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                  Country
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 1.5 }}>
                  {country.country}
                </Typography>
                <Divider sx={{ mb: 1.5 }} />
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2" color="text.secondary">Headcount:</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>{country.headcount.toLocaleString()}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">Avg Salary:</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600, color: 'primary.main' }}>
                    {country.average_salary.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {String(data.currency || 'USD')}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          ))}
        </Box>
      );
    }

    if (operation === 'get_salary_by_department') {
      const departments = data.departments as Array<{ department: string; headcount: number; average_salary: number; total_payroll: number }> | undefined;
      if (!departments || departments.length === 0) return null;

      return (
        <TableContainer component={Paper} variant="outlined" sx={{ mt: 2, borderRadius: 2 }}>
          <Table size="small">
            <TableHead sx={{ bgcolor: '#f8fafc' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 600 }}>Department</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600 }}>Headcount</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600 }}>Average Salary ({String(data.currency || 'USD')})</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600 }}>Total Payroll ({String(data.currency || 'USD')})</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {departments.map((dept) => (
                <TableRow key={dept.department} hover>
                  <TableCell sx={{ fontWeight: 500 }}>{dept.department}</TableCell>
                  <TableCell align="right">{dept.headcount.toLocaleString()}</TableCell>
                  <TableCell align="right">{dept.average_salary.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                  <TableCell align="right">{dept.total_payroll.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      );
    }

    if (operation === 'get_salary_by_country') {
      const countries = data.countries as Array<{ country: string; headcount: number; average_salary: number; total_payroll: number }> | undefined;
      if (!countries || countries.length === 0) return null;

      return (
        <TableContainer component={Paper} variant="outlined" sx={{ mt: 2, borderRadius: 2 }}>
          <Table size="small">
            <TableHead sx={{ bgcolor: '#f8fafc' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 600 }}>Country</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600 }}>Headcount</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600 }}>Average Salary ({String(data.currency || 'USD')})</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600 }}>Total Payroll ({String(data.currency || 'USD')})</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {countries.map((country) => (
                <TableRow key={country.country} hover>
                  <TableCell sx={{ fontWeight: 500 }}>{country.country}</TableCell>
                  <TableCell align="right">{country.headcount.toLocaleString()}</TableCell>
                  <TableCell align="right">{country.average_salary.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                  <TableCell align="right">{country.total_payroll.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      );
    }

    if (operation === 'get_salary_range_count') {
      const count = Number(data.count || 0);
      const total = Number(data.total_workforce || 1);
      const percentage = Number(data.percentage || 0);

      return (
        <Card variant="outlined" sx={{ mt: 2, borderRadius: 2, bgcolor: '#f8fafc' }}>
          <CardContent sx={{ p: 2.5 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="subtitle2" color="text.secondary">Workforce Share</Typography>
              <Chip label={`${percentage}% of total workforce`} size="small" color="primary" sx={{ fontWeight: 600 }} />
            </Box>
            <Typography variant="h4" sx={{ fontWeight: 700, color: 'primary.main', mb: 0.5 }}>
              {count.toLocaleString()} <Typography component="span" variant="body1" color="text.secondary">/ {total.toLocaleString()} employees</Typography>
            </Typography>
          </CardContent>
        </Card>
      );
    }

    return null;
  };

  return (
    <Box sx={{ maxWidth: 1000, mx: 'auto', p: { xs: 2, md: 3 } }}>
      <Paper
        elevation={0}
        sx={{
          p: 3,
          mb: 3,
          borderRadius: 3,
          border: '1px solid #e2e8f0',
          background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2, mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <AutoAwesomeOutlinedIcon color="primary" />
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              AI Compensation Assistant
            </Typography>
            <Chip
              label="Zero-Hallucination SQL"
              size="small"
              color="success"
              variant="outlined"
              sx={{ fontWeight: 600, fontSize: '0.75rem' }}
            />
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
              Reporting Currency:
            </Typography>
            <FormControl size="small">
              <Select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                sx={{ height: 32, fontSize: '0.8125rem', bgcolor: '#ffffff' }}
              >
                {CURRENCIES.map((c) => (
                  <MenuItem key={c} value={c} sx={{ fontSize: '0.8125rem' }}>
                    {c}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </Box>

        <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
          Ask natural-language questions regarding active headcount, departmental averages, country compensation, benchmarks, and salary distribution bands.
        </Typography>

        <Box sx={{ display: 'flex', gap: 1.5, mb: 2 }}>
          <TextField
            fullWidth
            size="medium"
            placeholder="e.g. Compare Engineering and Finance or How many employees in India?"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={loading}
            slotProps={{
              input: {
                sx: { bgcolor: '#ffffff', borderRadius: 2 },
              },
            }}
          />
          <Button
            variant="contained"
            onClick={() => handleAsk()}
            disabled={loading || !question.trim()}
            startIcon={loading ? <CircularProgress size={18} color="inherit" /> : <SendOutlinedIcon />}
            sx={{ px: 3, borderRadius: 2, minWidth: 110 }}
          >
            Ask
          </Button>
        </Box>

        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
          <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, mr: 0.5 }}>
            Try asking:
          </Typography>
          {QUICK_PROMPTS.slice(0, 5).map((prompt) => (
            <Chip
              key={prompt}
              label={prompt}
              size="small"
              onClick={() => handleAsk(prompt)}
              disabled={loading}
              sx={{
                bgcolor: '#ffffff',
                border: '1px solid #e2e8f0',
                cursor: 'pointer',
                fontSize: '0.75rem',
                '&:hover': { bgcolor: '#eff6ff', borderColor: 'primary.light' },
              }}
            />
          ))}
        </Box>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {result && (
        <Card
          elevation={0}
          sx={{
            borderRadius: 3,
            border: '1px solid #cbd5e1',
            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)',
            bgcolor: '#ffffff',
          }}
        >
          <CardContent sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {result.operation === 'unsupported_query' ? (
                  <HelpOutlineOutlinedIcon color="warning" fontSize="small" />
                ) : (
                  <CheckCircleOutlineOutlinedIcon color="success" fontSize="small" />
                )}
                <Typography variant="subtitle2" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: 'text.secondary' }}>
                  {result.operation.replace(/_/g, ' ')}
                </Typography>
              </Box>
              <Chip
                label={String(result.metadata.based_on || result.metadata.status || 'Verified')}
                size="small"
                variant="outlined"
                sx={{ fontSize: '0.7rem' }}
              />
            </Box>

            <Typography variant="h6" sx={{ fontWeight: 600, lineHeight: 1.5, color: '#0f172a' }}>
              {result.answer}
            </Typography>

            {renderVisualizer()}
          </CardContent>
        </Card>
      )}
    </Box>
  );
};
