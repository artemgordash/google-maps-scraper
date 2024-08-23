import { waitForTabIdle } from '@/helpers/wait-for-tab-idle';
import { DownloadRounded } from '@mui/icons-material';
import {
  Box,
  Input,
  Button,
  Typography,
  Modal,
  ModalClose,
  ModalDialog,
} from '@mui/joy';
import { csv2json, json2csv } from 'json-2-csv';
import { browser } from 'wxt/browser';

export const Intro = () => {
  const [url, setUrl] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [links, setLinks] = useState<any[]>([]);
  const [scraped, setScraped] = useState<any[]>([]);
  const [filename, setFilename] = useState('');
  const [fileData, setFileData] = useState<any[]>([]);
  const [openModal, setOpenModal] = useState(false);
  const urlQuery = url.split('/').at(-3)?.split('+').join(' ');
  const [tabs, setTabs] = useState<number[]>([]);

  useEffect(() => {
    const scrapeThemAll = async () => {
      for (const link of links) {
        const details = await getCompanyDetails(link);
        console.log('🚀 ~ scrapeThemAll ~ details:', details);
        setScraped((prev) => {
          const nextValue = [...prev, details];
          console.log('🚀 ~ setScraped ~ nextValue.length:', nextValue.length);
          if (nextValue.length === links.length) {
            setLoading(false);
            browser.notifications.create({
              iconUrl: './icon/128.png',
              message: 'Export available for download.',
              type: 'basic',
              title: 'Scraping Complete',
            });
          }
          return nextValue;
        });
      }
    };

    scrapeThemAll();
  }, [links]);

  const getCompanyDetails = async (url: string) => {
    const finalData: { [k: string]: any } = {};
    const googleMapsTab = await browser.tabs.create({
      pinned: true,
      active: false,
      url,
    });
    setTabs((prev) => [...prev, googleMapsTab.id!]);
    try {
      await waitForTabIdle(googleMapsTab.id!);
      const data = await browser.scripting.executeScript({
        target: { tabId: googleMapsTab.id! },
        files: ['scrape-details.js'],
      });
      finalData.details = data[0].result;
    } catch (e) {
      console.log('Google Maps details fails');
    } finally {
      await browser.tabs.remove(googleMapsTab.id!);
    }

    if (finalData.details?.website) {
      const websiteTab = await browser.tabs.create({
        url: finalData.details.website,
        active: false,
        pinned: true,
      });
      setTabs((prev) => [...prev, websiteTab.id!]);
      try {
        await waitForTabIdle(websiteTab.id!);
        const websiteData = await browser.scripting.executeScript({
          target: { tabId: websiteTab.id! },
          files: ['scrape-website.js'],
        });
        finalData.socialMedias = websiteData[0].result;
      } catch (e) {
        console.error('Failed to scrape social medias');
      } finally {
        await browser.tabs.remove(websiteTab.id!);
      }
    }

    return {
      Company: finalData.details?.company,
      Category: finalData.details?.category,
      Description: finalData.socialMedias?.Description,
      Website: finalData.details?.website,
      Address: finalData.details?.address,
      City: finalData.details?.city,
      State: finalData.details?.state,
      Country: finalData.details?.country,
      'Postal Code': finalData.details?.postalCode,
      'Phone Number': finalData.details?.phoneNumber,
      ...finalData.details?.workingHours,
      Instagram: finalData.socialMedias?.Instagram,
      Twitter: finalData.socialMedias?.Twitter,
      Facebook: finalData.socialMedias?.Facebook,
      Linkedin: finalData.socialMedias?.Linkedin,
      Youtube: finalData.socialMedias?.Youtube,
      Tiktok: finalData.socialMedias?.Tiktok,
      'Google Maps Url': url,
    };
  };

  const getCompaniesList = async () => {
    setLoading(true);
    const tab = await browser.tabs.create({
      pinned: true,
      active: false,
      url: `${url}&hl=en`,
    });

    setTabs((prev) => [...prev, tab.id!]);

    await waitForTabIdle(tab.id!);

    new Promise((resolve, reject) =>
      setTimeout(() => {
        reject('Timeout exceed');
        browser.tabs.remove(tab.id!);
        getCompaniesList();
      }, 120000)
    );

    const data = await browser.scripting.executeScript({
      target: { tabId: tab.id! },
      files: ['scrape-list.js'],
    });
    const links = data[0].result;
    console.log('🚀 ~ getCompaniesList ~ links:', links);
    setLinks(links);
    await browser.tabs.remove(tab.id!);
  };

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
    a.setAttribute('download', `${filename}.csv`);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const resetAll = () => {
    setLoading(false);
    setLinks([]);
    setScraped([]);
    setFileData([]);
    setUrl('');
    setFilename('');
    setFile(null);
    setOpenModal(false);

    tabs.forEach((id) => {
      console.log('🚀 ~ tabs.forEach ~ id:', id);
      try {
        browser.tabs.remove(id).then(console.log);
      } catch (error) {
        console.error('Failed to remove tab', error);
      }
    });

    setTabs([]);
  };

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
          </Box>
          <Box sx={{ minWidth: 500, mt: 2, overflow: 'auto' }}>
            <ModalClose />
            {fileData.map((d, i) => (
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
                <Typography key={i}>{d.Company}</Typography>
                <Typography level={'body-sm'} color={'neutral'} key={i}>
                  {d.City}
                </Typography>
              </Box>
            ))}
          </Box>
          <Button
            onClick={() => {
              setLinks(
                fileData.map(
                  (d) =>
                    `http://maps.google.com/?q=${d.Company}+${d.City}+${d.Address}`
                )
              );
              setOpenModal(false);
            }}
          >
            SCRAPE THEM ALL!!!
          </Button>
        </ModalDialog>
      </Modal>
      <Box sx={sheetStyle}>
        <Typography textAlign={'center'}>{urlQuery || filename}</Typography>
        <Input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder='Google Maps URL'
        />
        {!(scraped.length === links.length && scraped.length !== 0) && (
          <>
            <Button disabled={!url} onClick={getCompaniesList}>
              {loading
                ? `${
                    links.length ? `${scraped.length} / ${links.length} - ` : ''
                  } Scraping...`
                : 'Get businesses'}
            </Button>
            {loading && (
              <Button color={'danger'} onClick={resetAll}>
                Stop
              </Button>
            )}
          </>
        )}
        {!!links.length && scraped.length === links.length && (
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
        <Typography sx={{ mx: 'auto' }}>or</Typography>
        <Button
          type={'file'}
          variant={'outlined'}
          // @ts-ignore
          onClick={() => fileInputRef!.current!.click()}
        >
          Get businesses from a CSV file
        </Button>
        <input
          onChange={async (e) => {
            if (!e.target.files?.length) return;

            const reader = new FileReader();
            reader.onload = async () => {
              const text = reader.result;
              const json = csv2json(text as string) as {
                Company: string;
                City: string;
                State: string;
              }[];

              setFileData(json);
              setOpenModal(true);
            };

            reader.readAsText(e.target.files[0]);

            e.target.value = '';
          }}
          accept='.csv, .json'
          ref={fileInputRef}
          hidden
          type={'file'}
        />
        <Typography
          component={'a'}
          textAlign={'center'}
          href={'https://cloudconvert.com'}
          target={'_blank'}
          level={'body-sm'}
        >
          Convert any file to CSV
        </Typography>
      </Box>
    </Box>
  );
};
