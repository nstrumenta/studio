FROM node:20.3-bullseye-slim

# curl
RUN apt-get -y update; apt-get install curl wget -y
RUN apt-get install -y gnupg

# git
RUN apt-get install git -y

# jq
RUN apt-get install jq -y

# fuse (for gcsfuse)
RUN apt-get install fuse -y


# install go
# install cgo-related dependencies
RUN set -eux; \
	apt-get update; \
	apt-get install -y --no-install-recommends \
		g++ \
		gcc \
		libc6-dev \
		make \
		pkg-config \
	;

ENV PATH /usr/local/go/bin:$PATH

ENV GOLANG_VERSION 1.20.8

RUN set -eux; \
	arch="$(dpkg --print-architecture)"; arch="${arch##*-}"; \
	url=; \
	case "$arch" in \
		'amd64') \
			url='https://dl.google.com/go/go1.20.8.linux-amd64.tar.gz'; \
			sha256='cc97c28d9c252fbf28f91950d830201aa403836cbed702a05932e63f7f0c7bc4'; \
			;; \
		'armel') \
			export GOARCH='arm' GOARM='5' GOOS='linux'; \
			;; \
		'armhf') \
			url='https://dl.google.com/go/go1.20.8.linux-armv6l.tar.gz'; \
			sha256='6fd6b0bd7861d8ff69d6f25b879c69cd25ee33b2cc52b6ed3a6c0d26368e0dcb'; \
			;; \
		'arm64') \
			url='https://dl.google.com/go/go1.20.8.linux-arm64.tar.gz'; \
			sha256='15ab379c6a2b0d086fe3e74be4599420e66549edf7426a300ee0f3809500f89e'; \
			;; \
		'i386') \
			url='https://dl.google.com/go/go1.20.8.linux-386.tar.gz'; \
			sha256='d6e526520cf519049a854d7344b0a5fbe9675a3f24e7f22c44e38d8387ef942c'; \
			;; \
		'mips64el') \
			export GOARCH='mips64le' GOOS='linux'; \
			;; \
		'ppc64el') \
			url='https://dl.google.com/go/go1.20.8.linux-ppc64le.tar.gz'; \
			sha256='a5034a9c7eac6c5bcc650c2605c5edb4039c7b6064e2a2ea43c415c8af91f5f6'; \
			;; \
		'riscv64') \
			export GOARCH='riscv64' GOOS='linux'; \
			;; \
		's390x') \
			url='https://dl.google.com/go/go1.20.8.linux-s390x.tar.gz'; \
			sha256='28261a277f4a724d3a3c56b50ca892ea762778a4b64b5e16b2b8a81faf523394'; \
			;; \
		*) echo >&2 "error: unsupported architecture '$arch' (likely packaging update needed)"; exit 1 ;; \
	esac; \
	build=; \
	if [ -z "$url" ]; then \
# https://github.com/golang/go/issues/38536#issuecomment-616897960
		build=1; \
		url='https://dl.google.com/go/go1.20.8.src.tar.gz'; \
		sha256='38d71714fa5279f97240451956d8e47e3c1b6a5de7cb84137949d62b5dd3182e'; \
		echo >&2; \
		echo >&2 "warning: current architecture ($arch) does not have a compatible Go binary release; will be building from source"; \
		echo >&2; \
	fi; \
	\
	wget -O go.tgz.asc "$url.asc"; \
	wget -O go.tgz "$url" --progress=dot:giga; \
	echo "$sha256 *go.tgz" | sha256sum -c -; \
	\
# https://github.com/golang/go/issues/14739#issuecomment-324767697
	GNUPGHOME="$(mktemp -d)"; export GNUPGHOME; \
# https://www.google.com/linuxrepositories/
	gpg --batch --keyserver keyserver.ubuntu.com --recv-keys 'EB4C 1BFD 4F04 2F6D DDCC  EC91 7721 F63B D38B 4796'; \
# let's also fetch the specific subkey of that key explicitly that we expect "go.tgz.asc" to be signed by, just to make sure we definitely have it
	gpg --batch --keyserver keyserver.ubuntu.com --recv-keys '2F52 8D36 D67B 69ED F998  D857 78BD 6547 3CB3 BD13'; \
	gpg --batch --verify go.tgz.asc go.tgz; \
	gpgconf --kill all; \
	rm -rf "$GNUPGHOME" go.tgz.asc; \
	\
	tar -C /usr/local -xzf go.tgz; \
	rm go.tgz; \
	\
	if [ -n "$build" ]; then \
		savedAptMark="$(apt-mark showmanual)"; \
# add backports for newer go version for bootstrap build: https://github.com/golang/go/issues/44505
		( \
			. /etc/os-release; \
			echo "deb https://deb.debian.org/debian $VERSION_CODENAME-backports main" > /etc/apt/sources.list.d/backports.list; \
			\
			apt-get update; \
			apt-get install -y --no-install-recommends -t "$VERSION_CODENAME-backports" golang-go; \
		); \
		\
		export GOCACHE='/tmp/gocache'; \
		\
		( \
			cd /usr/local/go/src; \
# set GOROOT_BOOTSTRAP + GOHOST* such that we can build Go successfully
			export GOROOT_BOOTSTRAP="$(go env GOROOT)" GOHOSTOS="$GOOS" GOHOSTARCH="$GOARCH"; \
			./make.bash; \
		); \
		\
		apt-mark auto '.*' > /dev/null; \
		apt-mark manual $savedAptMark > /dev/null; \
		apt-get purge -y --auto-remove -o APT::AutoRemove::RecommendsImportant=false; \
		rm -rf /var/lib/apt/lists/*; \
		\
# remove a few intermediate / bootstrapping files the official binary release tarballs do not contain
		rm -rf \
			/usr/local/go/pkg/*/cmd \
			/usr/local/go/pkg/bootstrap \
			/usr/local/go/pkg/obj \
			/usr/local/go/pkg/tool/*/api \
			/usr/local/go/pkg/tool/*/go_bootstrap \
			/usr/local/go/src/cmd/dist/dist \
			"$GOCACHE" \
		; \
	fi; \
	\
	go version

ENV GOPATH /go
ENV PATH $GOPATH/bin:$PATH
RUN mkdir -p "$GOPATH/src" "$GOPATH/bin" && chmod -R 1777 "$GOPATH"


# python
RUN apt-get install python3 python3-pip -y

# Add gcloud to PATH
ENV PATH=/usr/local/src/google-cloud-sdk/bin:$PATH

# Install gcloud + components
# NOTE 1: the __pycache__ cleanup is done to reduce image size (if needed, they will be regenerated at runtime)
# NOTE 2: the .backup directory is also removed to significantly reduce image size
RUN set -eux; \
    GCLOUD_VERSION=413.0.0; \
    dpkgArch="$(dpkg --print-architecture)"; \
    	dir=/usr/local/src; \
    	url=; \
    	case "${dpkgArch##*-}" in \
    		'amd64') \
    			url="https://dl.google.com/dl/cloudsdk/channels/rapid/downloads/google-cloud-cli-$GCLOUD_VERSION-linux-x86_64.tar.gz"; \
    			sha256='f5e6e3f08371287e00ae38f804cb02579869f70d88e6bb9dfc1f339d3261e04e'; \
    			;; \
    		'arm64') \
    			url="https://dl.google.com/dl/cloudsdk/channels/rapid/downloads/google-cloud-cli-$GCLOUD_VERSION-linux-arm.tar.gz"; \
    			sha256='3bd79dcceac169b21d2379380116db69312d80ac2e910288e11c64fb20835c5b'; \
    			;; \
    		*) echo >&2 "error: unsupported architecture '$dpkgArch' (likely packaging update needed)"; exit 1 ;; \
    	esac; \
        curl --location --output gcloud.tar.gz "$url"; \
        echo "$sha256  gcloud.tar.gz" | sha256sum -cw -; \
        mkdir -p $dir; \
        tar -zx -C $dir -f gcloud.tar.gz; \
        $dir/google-cloud-sdk/install.sh --quiet; \
        gcloud components install --quiet kubectl; \
        gcloud auth configure-docker gcr.io,us-central1-docker.pkg.dev --quiet; \
        rm -f gcloud.tar.gz; \
        rm -rf $(find $dir/google-cloud-sdk/ -name __pycache__ -type d); \
        rm -rf $dir/google-cloud-sdk/.install/.backup


#install gcsfuse
RUN GCSFUSE_REPO=gcsfuse-bullseye; \
	echo "deb https://packages.cloud.google.com/apt $GCSFUSE_REPO main" | tee /etc/apt/sources.list.d/gcsfuse.list; \
	curl https://packages.cloud.google.com/apt/doc/apt-key.gpg | apt-key add -

RUN	apt-get -y update
RUN apt-get install gcsfuse -y

# mcap cli
RUN wget https://github.com/foxglove/mcap/releases/download/releases%2Fmcap-cli%2Fv0.0.34/mcap-linux-amd64 -O /usr/local/bin/mcap
RUN chmod +x /usr/local/bin/mcap


#install nstrumenta
RUN npm i -g nstrumenta@3.1.8
