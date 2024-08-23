import {
  Box,
  Button,
  CircularProgress,
  LinearProgress,
  Step,
  StepIndicator,
  Stepper,
  Typography,
} from '@mui/joy';

export const ProgressScreen = () => {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        height: '90vh',
      }}
    >
      <Stepper orientation='vertical' size='lg'>
        <Step
          indicator={
            <StepIndicator variant='solid' color='primary'>
              1
            </StepIndicator>
          }
        >
          <Typography>Getting the list of businesses</Typography>
          <CircularProgress />
        </Step>
        <Step indicator={<StepIndicator variant='solid'>2</StepIndicator>}>
          <Typography>Scraping them all</Typography>
          <LinearProgress determinate value={25} />
          <Typography level={'body-sm'}>150 / 500</Typography>
        </Step>
        <Step indicator={<StepIndicator variant='solid'>3</StepIndicator>}>
          <Typography>Job done</Typography>
          <Button size={'sm'} variant={'plain'}>
            Export
          </Button>
        </Step>
      </Stepper>
    </Box>
  );
};
