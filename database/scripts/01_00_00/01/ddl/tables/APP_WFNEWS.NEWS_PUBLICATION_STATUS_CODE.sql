/* ---------------------------------------------------- */
/*  Generated by Enterprise Architect Version 12.0 		*/
/*  Created On : 22-Jul-2022 11:13:29 AM 				*/
/*  DBMS       : PostgreSQL 						*/
/* ---------------------------------------------------- */

/* Create Tables */

CREATE TABLE "wfnews"."news_publication_status_code"
(
	"news_publication_status_code" varchar(10)	 NOT NULL,    -- NEWS_PUBLICATION_STATUS_CODE: News Publication Status Code tracks the state of a news publication.  Values are:  	- Draft 	- Published 	- Rescinded 	- Archived
	"description" varchar(200)	 NOT NULL,    -- DESCRIPTION is the display quality description of the code value.
	"display_order" decimal(3) NULL,    -- DISPLAY ORDER is to allow non alphabetic sorting e.g. M T W Th F S S.
	"effective_date" timestamp NOT NULL DEFAULT DATE_TRUNC('day', current_date ),    -- EFFECTIVE_DATE is the date code value becomes effective.
	"expiry_date" timestamp NOT NULL DEFAULT TO_DATE('9999-12-31', 'yyyy-mm-dd'),    -- EXPIRY_DATE is the date code value expires.
	"revision_count" decimal(10) NOT NULL DEFAULT 0,    -- REVISION_COUNT is the number of times that the row of data has been changed. The column is used for optimistic locking via application code.
	"create_user" varchar(64)	 NOT NULL,    -- CREATE_USER is an audit column that indicates the user that created the record.
	"create_date" timestamp NOT NULL DEFAULT current_date,    -- CREATE_DATE is the date and time the row of data was created.
	"update_user" varchar(64)	 NOT NULL,    -- UPDATE_USER is an audit column that indicates the user that updated the record.
	"update_date" timestamp NOT NULL DEFAULT current_date    -- UPDATE_DATE is the date and time the row of data was updated.
)
;

/* Create Table Comments, Sequences for Autonumber Columns */

COMMENT ON TABLE "wfnews"."news_publication_status_code"
	IS 'News Publication Status Code tracks the state of a news publication.  Values are:  	- Draft 	- Published 	- Rescinded 	- Archived'
;

COMMENT ON COLUMN "wfnews"."news_publication_status_code"."news_publication_status_code"
	IS 'NEWS_PUBLICATION_STATUS_CODE: News Publication Status Code tracks the state of a news publication.  Values are:  	- Draft 	- Published 	- Rescinded 	- Archived'
;

COMMENT ON COLUMN "wfnews"."news_publication_status_code"."description"
	IS 'DESCRIPTION is the display quality description of the code value.'
;

COMMENT ON COLUMN "wfnews"."news_publication_status_code"."display_order"
	IS 'DISPLAY ORDER is to allow non alphabetic sorting e.g. M T W Th F S S.'
;

COMMENT ON COLUMN "wfnews"."news_publication_status_code"."effective_date"
	IS 'EFFECTIVE_DATE is the date code value becomes effective.'
;

COMMENT ON COLUMN "wfnews"."news_publication_status_code"."expiry_date"
	IS 'EXPIRY_DATE is the date code value expires.'
;

COMMENT ON COLUMN "wfnews"."news_publication_status_code"."revision_count"
	IS 'REVISION_COUNT is the number of times that the row of data has been changed. The column is used for optimistic locking via application code.'
;

COMMENT ON COLUMN "wfnews"."news_publication_status_code"."create_user"
	IS 'CREATE_USER is an audit column that indicates the user that created the record.'
;

COMMENT ON COLUMN "wfnews"."news_publication_status_code"."create_date"
	IS 'CREATE_DATE is the date and time the row of data was created.'
;

COMMENT ON COLUMN "wfnews"."news_publication_status_code"."update_user"
	IS 'UPDATE_USER is an audit column that indicates the user that updated the record.'
;

COMMENT ON COLUMN "wfnews"."news_publication_status_code"."update_date"
	IS 'UPDATE_DATE is the date and time the row of data was updated.'
;

/* Create Primary Keys, Indexes, Uniques, Checks */

ALTER TABLE "wfnews"."news_publication_status_code" ADD CONSTRAINT "pubstcd_pk"
	PRIMARY KEY ("news_publication_status_code")
;