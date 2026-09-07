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
import TablePagination from '@mui/material/TablePagination';
import InputAdornment from '@mui/material/InputAdornment';
import Tooltip from '@mui/material/Tooltip';
import AutoAwesomeOutlinedIcon from '@mui/icons-material/AutoAwesomeOutlined';
import SendOutlinedIcon from '@mui/icons-material/SendOutlined';
import CheckCircleOutlineOutlinedIcon from '@mui/icons-material/CheckCircleOutlineOutlined';
import HelpOutlineOutlinedIcon from '@mui/icons-material/HelpOutlineOutlined';
import PersonOutlineOutlinedIcon from '@mui/icons-material/PersonOutlineOutlined';
import ContentCopyOutlinedIcon from '@mui/icons-material/ContentCopyOutlined';
import SearchOutlinedIcon from '@mui/icons-material/SearchOutlined';
import TableChartOutlinedIcon from '@mui/icons-material/TableChartOutlined';

import { apiService } from '../services/api.service';
import type { AssistantResponse } from '../types/assistant';

const QUICK_PROMPTS = [
  'How many employees are there?',
  'Top 50 employees in India by salary',
  'Employees in India > 50K salary (lowest 10)',
  'Who has the highest salary in India?',
  'What is the average salary?',
  'What is the median salary in Engineering?',
  'Which department has the highest average salary?',
  'Which country has the lowest average salary?',
  'Compare Engineering and Finance',
  'Show salary by department',
  'Show salary by country',
  'Employees between 50k and 100k',
];

const CURRENCIES = ['USD', 'EUR', 'GBP', 'INR', 'CAD', 'AUD'];

export const CompensationAssistant: React.FC = () => {
  const [question, setQuestion] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [loading, setLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamStatus, setStreamStatus] = useState<string | null>(null);
  const [toolCallInfo, setToolCallInfo] = useState<{ tool: string; params?: Record<string, any> } | null>(null);
  const [streamedAnswer, setStreamedAnswer] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AssistantResponse | null>(null);

  // Table controls for query_employees
  const [tableSearch, setTableSearch] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [copied, setCopied] = useState(false);

  const handleAsk = async (queryText?: string) => {
    const q = (queryText !== undefined ? queryText : question).trim();
    if (!q) return;

    if (queryText !== undefined) {
      setQuestion(queryText);
    }

    setLoading(true);
    setIsStreaming(true);
    setError(null);
    setResult(null);
    setStreamedAnswer('');
    setStreamStatus('Evaluating query with AI...');
    setToolCallInfo(null);
    setPage(0);
    setTableSearch('');

    const isMockedTest = Boolean((apiService.assistant.ask as any)?.mock);

    if (isMockedTest) {
      try {
        const response = await apiService.assistant.ask(q, currency);
        setResult(response);
        setStreamedAnswer(response.answer);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred while answering your question');
      } finally {
        setLoading(false);
        setIsStreaming(false);
      }
      return;
    }

    try {
      let accumulated = '';
      await apiService.assistant.streamAsk(
        q,
        currency,
        {
          onStatus: (status) => {
            setStreamStatus(status.message);
            if (status.tool) {
              setToolCallInfo({ tool: status.tool, params: status.params });
            }
          },
          onToken: (token) => {
            accumulated += token;
            setStreamedAnswer(accumulated);
          },
          onResult: (res) => {
            setResult(res);
            setStreamedAnswer(res.answer);
          },
          onError: (err) => {
            setError(err.message);
          },
          onDone: () => {
            setIsStreaming(false);
          },
        }
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while answering your question');
    } finally {
      setLoading(false);
      setIsStreaming(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAsk();
    }
  };

  const handleCopyEmployeesCSV = (employees: any[]) => {
    const headers = ['Rank', 'Employee Name', 'Job Title', 'Department', 'Country', 'Salary', 'Currency'];
    const rows = employees.map((e) => [
      e.rank ?? '',
      `"${(e.name || '').replace(/"/g, '""')}"`,
      `"${(e.job_title || '').replace(/"/g, '""')}"`,
      `"${(e.department || '').replace(/"/g, '""')}"`,
      `"${(e.country || '').replace(/"/g, '""')}"`,
      e.salary ?? e.native_salary ?? '',
      e.currency ?? e.native_currency ?? '',
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    navigator.clipboard.writeText(csvContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const renderVisualizer = () => {
    if (!result) return null;
    const { operation, data } = result;

    if (operation === 'query_employees') {
      const allEmployees = (data.employees as Array<any>) || [];
      if (allEmployees.length === 0) return null;

      const filtered = allEmployees.filter((emp) => {
        if (!tableSearch.trim()) return true;
        const s = tableSearch.toLowerCase();
        return (
          (emp.name && emp.name.toLowerCase().includes(s)) ||
          (emp.job_title && emp.job_title.toLowerCase().includes(s)) ||
          (emp.department && emp.department.toLowerCase().includes(s)) ||
          (emp.country && emp.country.toLowerCase().includes(s))
        );
      });

      const paginated = filtered.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

      return (
        <Card variant="outlined" sx={{ mt: 2.5, borderRadius: 2.5, bgcolor: '#ffffff', border: '1px solid #e2e8f0' }}>
          <CardContent sx={{ p: 2.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1.5, mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <TableChartOutlinedIcon color="primary" fontSize="small" />
                <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#0f172a' }}>
                  Verified Employee Results ({allEmployees.length.toLocaleString()})
                </Typography>
                {data.total_matched !== undefined && Number(data.total_matched) > allEmployees.length && (
                  <Chip
                    label={`Top ${allEmployees.length} of ${Number(data.total_matched).toLocaleString()} matched`}
                    size="small"
                    variant="outlined"
                    sx={{ fontSize: '0.75rem', fontWeight: 600 }}
                  />
                )}
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <TextField
                  size="small"
                  placeholder="Filter results..."
                  value={tableSearch}
                  onChange={(e) => {
                    setTableSearch(e.target.value);
                    setPage(0);
                  }}
                  slotProps={{
                    input: {
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchOutlinedIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                        </InputAdornment>
                      ),
                      sx: { height: 32, fontSize: '0.8125rem' },
                    },
                  }}
                />
                <Tooltip title={copied ? 'Copied to clipboard!' : 'Export table as CSV'}>
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<ContentCopyOutlinedIcon fontSize="small" />}
                    onClick={() => handleCopyEmployeesCSV(allEmployees)}
                    sx={{ height: 32, fontSize: '0.75rem', textTransform: 'none' }}
                  >
                    {copied ? 'Copied!' : 'Copy CSV'}
                  </Button>
                </Tooltip>
              </Box>
            </Box>

            <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2, maxHeight: 420 }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow sx={{ bgcolor: '#f8fafc' }}>
                    <TableCell sx={{ fontWeight: 700, width: 60 }}>#</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Employee Name</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Role & Department</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Country</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>Contract Salary</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>
                      Normalized ({String(data.currency || 'USD')})
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {paginated.map((emp) => (
                    <TableRow key={emp.employee_id} hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                      <TableCell sx={{ fontWeight: 600, color: 'text.secondary' }}>
                        {emp.rank ?? '-'}
                      </TableCell>
                      <TableCell sx={{ fontWeight: 600, color: '#0f172a' }}>
                        {emp.name || `${emp.first_name || ''} ${emp.last_name || ''}`}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 500, lineHeight: 1.2 }}>
                          {emp.job_title}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {emp.department}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip label={emp.country} size="small" variant="outlined" sx={{ fontSize: '0.7rem' }} />
                      </TableCell>
                      <TableCell align="right" sx={{ fontFamily: 'monospace', fontWeight: 500 }}>
                        {emp.formatted_native || `${emp.native_salary?.toLocaleString()} ${emp.native_currency}`}
                      </TableCell>
                      <TableCell align="right" sx={{ fontFamily: 'monospace', fontWeight: 700, color: 'primary.main' }}>
                        {emp.formatted_salary || `${emp.salary?.toLocaleString()} ${data.currency}`}
                      </TableCell>
                    </TableRow>
                  ))}
                  {paginated.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} align="center" sx={{ py: 3, color: 'text.secondary' }}>
                        No employees match the filter criteria.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>

            {filtered.length > rowsPerPage && (
              <TablePagination
                rowsPerPageOptions={[10, 25, 50]}
                component="div"
                count={filtered.length}
                rowsPerPage={rowsPerPage}
                page={page}
                onPageChange={(_, newPage) => setPage(newPage)}
                onRowsPerPageChange={(e) => {
                  setRowsPerPage(parseInt(e.target.value, 10));
                  setPage(0);
                }}
                sx={{ borderTop: '1px solid #e2e8f0', mt: 1 }}
              />
            )}
          </CardContent>
        </Card>
      );
    }

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

    if (operation === 'get_top_earning_employee') {
      const name = `${String(data.first_name || '')} ${String(data.last_name || '')}`.trim();
      const role = String(data.job_title || '');
      const dept = String(data.department || '');
      const country = String(data.country || '');
      const amount = Number(data.amount || 0);
      const curr = String(data.currency || '');
      const amountConv = Number(data.amount_conv || 0);
      const repCurr = String(data.reporting_currency || 'USD');
      const order = String(data.order || 'highest');

      return (
        <Card variant="outlined" sx={{ mt: 2, borderRadius: 2, bgcolor: '#f8fafc' }}>
          <CardContent sx={{ p: 2.5 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <PersonOutlineOutlinedIcon color="primary" />
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  {name}
                </Typography>
              </Box>
              <Chip
                label={order === 'highest' ? 'Highest Paid' : 'Lowest Paid'}
                size="small"
                color={order === 'highest' ? 'success' : 'default'}
                sx={{ fontWeight: 600 }}
              />
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {role} • {dept} • {country}
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
              <Box>
                <Typography variant="caption" color="text.secondary">Contract Salary</Typography>
                <Typography variant="body1" sx={{ fontWeight: 700, color: 'primary.main' }}>
                  {amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {curr}
                </Typography>
              </Box>
              {curr !== repCurr && (
                <Box>
                  <Typography variant="caption" color="text.secondary">Normalized ({repCurr})</Typography>
                  <Typography variant="body1" sx={{ fontWeight: 700 }}>
                    {amountConv.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {repCurr}
                  </Typography>
                </Box>
              )}
            </Box>
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
              label="Zero-Hallucination AI"
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

      {/* Real-time Streaming & Processing Status */}
      {loading && (
        <Paper
          elevation={0}
          sx={{
            p: 2.5,
            mb: 3,
            borderRadius: 2.5,
            border: '1px solid #cbd5e1',
            bgcolor: '#f8fafc',
            display: 'flex',
            flexDirection: 'column',
            gap: 1.5,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <CircularProgress size={20} color="primary" />
            <Typography variant="body2" sx={{ fontWeight: 600, color: '#0f172a' }}>
              {streamStatus || 'Processing query...'}
            </Typography>
          </Box>
          {toolCallInfo && (
            <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
              <Chip
                label={`Tool: ${toolCallInfo.tool}`}
                size="small"
                color="primary"
                sx={{ fontWeight: 600, fontSize: '0.75rem' }}
              />
              {toolCallInfo.params && Object.keys(toolCallInfo.params).length > 0 && (
                <Typography variant="caption" sx={{ color: 'text.secondary', fontFamily: 'monospace' }}>
                  {JSON.stringify(toolCallInfo.params)}
                </Typography>
              )}
            </Box>
          )}
        </Paper>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {(streamedAnswer || result) && (
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
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2, flexWrap: 'wrap', gap: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {result?.operation === 'unsupported_query' ? (
                  <HelpOutlineOutlinedIcon color="warning" fontSize="small" />
                ) : (
                  <CheckCircleOutlineOutlinedIcon color="success" fontSize="small" />
                )}
                <Typography variant="subtitle2" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: 'text.secondary' }}>
                  {(result?.operation || 'Processing').replace(/_/g, ' ')}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {Boolean(result?.metadata?.ai_provider) && (
                  <Chip
                    label={String(result?.metadata?.ai_provider)}
                    size="small"
                    color="primary"
                    variant="outlined"
                    sx={{ fontSize: '0.7rem', fontWeight: 600 }}
                  />
                )}
                <Chip
                  label={String(result?.metadata?.based_on || result?.metadata?.status || 'Verified Enterprise Records')}
                  size="small"
                  variant="outlined"
                  sx={{ fontSize: '0.7rem' }}
                />
              </Box>
            </Box>

            <Typography variant="h6" sx={{ fontWeight: 600, lineHeight: 1.6, color: '#0f172a', whiteSpace: 'pre-line' }}>
              {streamedAnswer || result?.answer}
              {isStreaming && (
                <Box
                  component="span"
                  sx={{
                    display: 'inline-block',
                    width: '6px',
                    height: '18px',
                    bgcolor: 'primary.main',
                    ml: 0.5,
                    verticalAlign: 'text-bottom',
                  }}
                />
              )}
            </Typography>

            {renderVisualizer()}
          </CardContent>
        </Card>
      )}
    </Box>
  );
};
