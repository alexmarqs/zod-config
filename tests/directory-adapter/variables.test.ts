import { beforeEach, afterEach, describe, expect, it, vi } from "vitest"
import * as os from 'node:os'

import * as variables from "@/lib/adapters/directory-adapter/variables"

vi.mock('node:os', () => {
  return {
    hostname: vi.fn(() => "hostname"),
  };
});

function cleanProcessEnv() {
  delete process.env.NODE_CONFIG_ENV
  delete process.env.NODE_ENV
  delete process.env.NODE_APP_INSTANCE
  delete process.env.HOST
  delete process.env.HOSTNAME
}

beforeEach(() => {
  cleanProcessEnv()
})

afterEach(() => {
  cleanProcessEnv()
  vi.restoreAllMocks()
})

describe("Deployment name", () => {
  it("should respect the NODE_CONFIG_ENV environment variable", () => {
    // given
    process.env.NODE_CONFIG_ENV = "production"

    // when
    const deploymentName = variables.resolveDeploymentName()

    // then
    expect(deploymentName).toEqual("production")
  })

  it("should respect the NODE_ENV environment variable", () => {
    // given
    process.env.NODE_ENV = "staging"

    // when
    const deploymentName = variables.resolveDeploymentName()

    // then
    expect(deploymentName).toEqual("staging")
  })

  it("should give the NODE_CONFIG_ENV environment variable a higher precedence than the NODE_ENV environment variable", () => {
    // given
    process.env.NODE_CONFIG_ENV = "production"
    process.env.NODE_ENV = "staging"

    // when
    const deploymentName = variables.resolveDeploymentName()

    // then
    expect(deploymentName).toEqual("production")
  })

  it("should default to \"development\"", () => {
    // given

    // when
    const deploymentName = variables.resolveDeploymentName()

    // then
    expect(deploymentName).toEqual("development")
  })
})

describe("Instance name", () => {
  it("should respect the NODE_APP_INSTANCE environment variable", () => {
    // given
    process.env.NODE_APP_INSTANCE = "foobar"

    // when
    const instanceName = variables.resolveInstanceName()

    // then
    expect(instanceName).toEqual("foobar")
  })
  it("should default to `null`", () => {
    // given

    // when
    const instanceName = variables.resolveInstanceName()

    // then
    expect(instanceName).toEqual(null)
  })
})

describe("Hostname", () => {
  it("should respect the HOST environment variable", () => {
    // given
    process.env.HOST = "perhaps-localhost"

    // when
    const hostname = variables.resolveHostname()

    // then
    expect(hostname).toEqual("perhaps-localhost")
  })

  it("should respect the HOSTNAME environment variable", () => {
    // given
    process.env.HOSTNAME = "maybe-remote-host"

    // when
    const hostname = variables.resolveHostname()

    // then
    expect(hostname).toEqual("maybe-remote-host")
  })

  it("should respect the os.hostname() function", () => {
    // given
    vi.spyOn(os, 'hostname').mockReturnValue("arbitrary-name")

    // when
    const hostname = variables.resolveHostname()

    // then
    expect(hostname).toEqual("arbitrary-name")
  })

  it("should give the HOST environment variable the highest precedence", () => {
    // given
    process.env.HOST = "perhaps-localhost"
    process.env.HOSTNAME = "maybe-remote-host"
    vi.spyOn(os, 'hostname').mockReturnValue("arbitrary-name")

    // when
    const hostname = variables.resolveHostname()

    // then
    expect(hostname).toEqual("perhaps-localhost")
  })

  it("should give the HOSTNAME environment variable a higher precedence than the os.hostname() function", () => {
    // given
    process.env.HOSTNAME = "maybe-remote-host"
    vi.spyOn(os, 'hostname').mockReturnValue("arbitrary-name")

    // when
    const hostname = variables.resolveHostname()

    // then
    expect(hostname).toEqual("maybe-remote-host")
  })
})

describe("Short hostname", () => {
  it("should be a substring of the resolved hostname", () => {
    // given
    process.env.HOST = "foo.bar.baz"

    // when
    const hostname = variables.resolveHostname()
    const shortHostname = variables.resolveShortHostname()

    // then
    expect(hostname.startsWith(shortHostname)).toBe(true)
  })
})
