import { Box, Heading, Text } from "@chakra-ui/react";

export function App() {
  return (
    <Box as="main" p="4">
      <Heading size="md">Job Saver</Heading>
      <Text mt="2" color="fg.muted">
        Open a Jobstreet job posting, then analyze it here.
      </Text>
    </Box>
  );
}
