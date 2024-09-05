import { searchByCompanyName, searchByQuery } from '@/helpers/googlemaps';
import { DownloadRounded } from '@mui/icons-material';
import {
  Box,
  Input,
  Button,
  Typography,
  Modal,
  ModalClose,
  ModalDialog,
  CircularProgress,
} from '@mui/joy';
import { json2csv } from 'json-2-csv';
import _ from 'lodash';

export const Intro = () => {
  const [query, setQuery] = useState('');
  const fileInputRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [scraped, setScraped] = useState<any[]>([]);
  const [filename, setFilename] = useState('');
  const [fileData, setFileData] = useState<any[]>([]);
  const [openModal, setOpenModal] = useState(false);
  const urlQuery = query.split('/').at(-3)?.split('+').join(' ');
  const [location, setLocation] = useState<string>('');
  const [tournamentName, setTournamentName] = useState<string>('');

  const sheetStyle = {
    minWidth: 400,
    border: '1px solid',
    borderColor: 'divider',
    p: 5,
    borderRadius: 'lg',
    maxWidth: 400,
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
  };

  const downloadCompaniesFile = async () => {
    const csvData = json2csv(
      scraped.filter((c) => c?.Company),
      { emptyFieldValue: '' }
    );
    const blob = new Blob([csvData], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', `${tournamentName}-${new Date().getFullYear()}`);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const resetAll = () => {
    setLoading(false);
    setScraped([]);
    setFileData([]);
    setQuery('');
    setFilename('');
    setOpenModal(false);
    setLocation('');
    setTournamentName('');
  };

  const showErrorNotification = async (message: string) =>
    await browser.notifications.create({
      type: 'basic',
      iconUrl: 'icon/96.png',
      title: 'Error',
      message: `Something went wrong: ${message}`,
    });

  const showFinishNotification = async () =>
    await browser.notifications.create({
      type: 'basic',
      iconUrl: 'icon/96.png',
      title: 'Export available',
      message: `${tournamentName}-${new Date().getFullYear()}`,
    });

  async function onReadFile(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files?.length) return;

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const text = reader.result as string;
        const data = _.uniqBy(text.split('\n').filter(Boolean), (v) => v);
        console.log('🚀 ~ reader.onload= ~ data:', data);

        if (!data.length) throw new Error('No data found');

        setFileData(data);
        setOpenModal(true);
      } catch (error) {
        alert(
          'Failed to read the file, ensure the file is a text file and companies are separated by new lines'
        );
      }
    };

    reader.readAsText(e.target.files[0]);

    e.target.value = '';
  }

  return (
    <Box
      sx={{
        display: 'flex',
        gap: 2,
        justifyContent: 'center',
        alignItems: 'center',
        height: '90vh',
      }}
    >
      <Modal
        sx={{ minWidth: 1000 }}
        onClose={() => setOpenModal(false)}
        open={openModal}
      >
        <ModalDialog>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <Typography>Companies: {fileData.length}</Typography>
            <Typography>{tournamentName}</Typography>
            <Typography>{location}</Typography>
          </Box>
          <Box sx={{ minWidth: 500, mt: 2, overflow: 'auto' }}>
            <ModalClose />
            {fileData.map((company, i) => (
              <Box
                key={i}
                sx={{
                  flex: 1,
                  pr: 2,
                  display: 'flex',
                  gap: 2,
                  justifyContent: 'space-between',
                }}
              >
                <Typography key={i}>{company}</Typography>
              </Box>
            ))}
          </Box>
          <Button
            sx={{ mt: 3 }}
            disabled={!location}
            onClick={async () => {
              try {
                setLoading(true);
                setOpenModal(false);
                const data = await searchByCompanyName(
                  fileData,
                  location,
                  tournamentName
                );
                setScraped(data);
                await showFinishNotification();
              } catch (error) {
                console.log('🚀 ~ onClick={ ~ error:', error);
                if (error instanceof Error) {
                  await showErrorNotification(error.message);
                }
              } finally {
                setLoading(false);
              }
            }}
          >
            {loading ? <CircularProgress /> : 'scrape them all'}
          </Button>
        </ModalDialog>
      </Modal>
      <Box sx={sheetStyle}>
        <Typography textAlign={'center'}>{urlQuery || filename}</Typography>
        <Input
          value={tournamentName}
          onChange={(e) => setTournamentName(e.target.value)}
          placeholder='Tournament name, ex: Las Vegas Pizza'
        />
        <Input
          value={location}
          onChange={(e) => {
            setLocation(e.target.value);
          }}
          placeholder={'Location, ex: Las Vegas'}
        />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder='Search query, ex: Top restaurants'
        />
        {!scraped.length && (
          <>
            {loading ? (
              <CircularProgress sx={{ mx: 'auto' }} />
            ) : (
              <Button
                disabled={!query || loading}
                onClick={async () => {
                  try {
                    setLoading(true);
                    const data = await searchByQuery(
                      `${query} in ${location}`,
                      tournamentName
                    );
                    setScraped(data);
                    console.log('🚀 ~ onClick={ ~ data:', data);
                    setLoading(false);
                    await showFinishNotification();
                  } catch (error) {
                    if (error instanceof Error) {
                      await showErrorNotification(error.message);
                    }
                  } finally {
                    setLoading(false);
                  }
                }}
              >
                Get businesses by search query
              </Button>
            )}
          </>
        )}
        {!scraped.length && (
          <Button
            type={'file'}
            variant={'outlined'}
            disabled={!location || !tournamentName || loading}
            // @ts-ignore
            onClick={() => fileInputRef!.current!.click()}
          >
            Get businesses from a text file
          </Button>
        )}
        {!!scraped.length && (
          <>
            <Button
              onClick={downloadCompaniesFile}
              startDecorator={<DownloadRounded />}
              color={'success'}
            >
              Download {scraped.length} companies
            </Button>
            <Button onClick={resetAll} variant={'outlined'} color={'neutral'}>
              Reset
            </Button>
          </>
        )}
        <input
          onChange={onReadFile}
          accept='.txt'
          ref={fileInputRef}
          hidden
          type={'file'}
        />
      </Box>
    </Box>
  );
};
